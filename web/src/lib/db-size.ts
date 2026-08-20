import "server-only";
import { db } from "@/lib/db";

/**
 * Postgres tracks storage per-table, not per-tenant - there's no built-in way
 * to ask "how many bytes does department X occupy" in a schema where every
 * department shares the same tables. This estimates it: for each
 * department-scoped table, take that table's real on-disk size
 * (pg_total_relation_size, includes its indexes) and split it proportionally
 * by each department's share of that table's row count. It's an estimate,
 * not an exact figure - labelled as such in the UI - but it's good enough to
 * inform a hosting/subscription sizing decision, which is all this is for.
 */
type DeptCount = { department_id: bigint | null; _count: { _all: number } };

/** One entry per department-scoped table to size - `countByDept` mirrors the
 * table's own groupBy-by-department_id call (kept explicit per table rather
 * than dynamic property access, so this stays type-safe against schema
 * changes). Prisma's groupBy return type is inferred from the literal args
 * object, which doesn't survive being wrapped in a typed function signature -
 * so this is deliberately untyped here and cast to DeptCount[] where consumed. */
const SIZED_TABLES = [
  { name: "contractors", countByDept: () => db.contractors.groupBy({ by: ["department_id"], _count: { _all: true } }) },
  { name: "employees", countByDept: () => db.employees.groupBy({ by: ["department_id"], _count: { _all: true } }) },
  { name: "schemes", countByDept: () => db.schemes.groupBy({ by: ["department_id"], _count: { _all: true } }) },
  { name: "works", countByDept: () => db.works.groupBy({ by: ["department_id"], _count: { _all: true } }) },
  { name: "payments", countByDept: () => db.payments.groupBy({ by: ["department_id"], _count: { _all: true } }) },
  { name: "salary_payments", countByDept: () => db.salary_payments.groupBy({ by: ["department_id"], _count: { _all: true } }) },
  {
    name: "work_experience_certificates",
    countByDept: () => db.work_experience_certificates.groupBy({ by: ["department_id"], _count: { _all: true } }),
  },
  { name: "certificate_logs", countByDept: () => db.certificate_logs.groupBy({ by: ["department_id"], _count: { _all: true } }) },
  { name: "users", countByDept: () => db.users.groupBy({ by: ["department_id"], _count: { _all: true } }) },
  { name: "audit_logs", countByDept: () => db.audit_logs.groupBy({ by: ["department_id"], _count: { _all: true } }) },
  { name: "login_logs", countByDept: () => db.login_logs.groupBy({ by: ["department_id"], _count: { _all: true } }) },
];

export type DepartmentSizeRow = {
  departmentId: string;
  departmentName: string;
  tenantCode: string;
  estimatedBytes: number;
};

export type DatabaseSizeReport = {
  totalDatabaseBytes: number;
  sumOfDepartmentEstimateBytes: number;
  departments: DepartmentSizeRow[];
};

async function tableTotalBytes(tableName: string): Promise<number> {
  const rows = await db.$queryRawUnsafe<{ bytes: bigint }[]>(
    `SELECT pg_total_relation_size($1::regclass) AS bytes`,
    tableName,
  );
  return Number(rows[0]?.bytes ?? 0);
}

export async function buildDatabaseSizeReport(): Promise<DatabaseSizeReport> {
  const [totalRows, departments] = await Promise.all([
    db.$queryRawUnsafe<{ bytes: bigint }[]>(`SELECT pg_database_size(current_database()) AS bytes`),
    db.departments.findMany({ select: { id: true, department_name: true, tenant_code: true }, orderBy: { department_name: "asc" } }),
  ]);
  const totalDatabaseBytes = Number(totalRows[0]?.bytes ?? 0);

  const estimateByDept = new Map<string, number>(departments.map((d) => [d.id.toString(), 0]));

  for (const table of SIZED_TABLES) {
    const [totalBytes, byDeptRaw] = await Promise.all([tableTotalBytes(table.name), table.countByDept()]);
    const byDept = byDeptRaw as DeptCount[];
    const totalRowsInTable = byDept.reduce((sum, r) => sum + r._count._all, 0);
    if (totalRowsInTable === 0 || totalBytes === 0) continue;

    for (const row of byDept) {
      if (row.department_id === null) continue;
      const key = row.department_id.toString();
      if (!estimateByDept.has(key)) continue;
      const share = row._count._all / totalRowsInTable;
      estimateByDept.set(key, (estimateByDept.get(key) ?? 0) + totalBytes * share);
    }
  }

  const rows: DepartmentSizeRow[] = departments.map((d) => ({
    departmentId: d.id.toString(),
    departmentName: d.department_name,
    tenantCode: d.tenant_code,
    estimatedBytes: Math.round(estimateByDept.get(d.id.toString()) ?? 0),
  }));
  rows.sort((a, b) => b.estimatedBytes - a.estimatedBytes);

  return {
    totalDatabaseBytes,
    sumOfDepartmentEstimateBytes: rows.reduce((sum, r) => sum + r.estimatedBytes, 0),
    departments: rows,
  };
}
