import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ReportFilterBar } from "@/components/report-filter-bar";
import { AuditLogTable, type AuditLogRow } from "@/components/audit-log-table";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";

export default async function SuperAdminAuditLogsPage(props: PageProps<"/super-admin/audit-logs">) {
  await requireSuperAdmin();
  const searchParams = await props.searchParams;

  const departmentFilter = typeof searchParams.department === "string" ? searchParams.department : "";
  const tableFilter = typeof searchParams.table === "string" ? searchParams.table : "";
  const actionFilter = typeof searchParams.action === "string" ? searchParams.action : "";
  const from = typeof searchParams.from === "string" ? searchParams.from : "";
  const to = typeof searchParams.to === "string" ? searchParams.to : "";

  const [departments, tableNames] = await Promise.all([
    db.departments.findMany({ select: { id: true, department_name: true }, orderBy: { department_name: "asc" } }),
    db.audit_logs.findMany({ distinct: ["table_name"], select: { table_name: true }, orderBy: { table_name: "asc" } }),
  ]);

  const logs = await db.audit_logs.findMany({
    where: {
      ...(departmentFilter ? { department_id: BigInt(departmentFilter) } : {}),
      ...(tableFilter ? { table_name: tableFilter } : {}),
      ...(actionFilter ? { action: actionFilter as "CREATE" | "UPDATE" | "DELETE" } : {}),
      ...(from || to
        ? {
            created_at: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    include: {
      users: { select: { name: true } },
      departments: { select: { department_name: true } },
    },
    orderBy: { created_at: "desc" },
    take: 500,
  });

  const rows: AuditLogRow[] = logs.map((l) => ({
    id: l.id.toString(),
    created_at: l.created_at.toISOString(),
    user_name: l.users?.name ?? null,
    action: l.action,
    table_name: l.table_name,
    record_id: l.record_id.toString(),
    reason: l.reason,
    ip_address: l.ip_address,
    old_data: l.old_data,
    new_data: l.new_data,
    department_name: l.departments?.department_name ?? "-",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="auditLogs"
        title="Audit Logs"
        description="Every create, update, and delete performed across all departments, with who did it and when."
      />

      <Card>
        <CardContent className="pt-6">
          <ReportFilterBar
            fields={[
              {
                type: "select",
                name: "department",
                label: "Department",
                defaultValue: "",
                options: [
                  { value: "", label: "All departments" },
                  ...departments.map((d) => ({ value: d.id.toString(), label: d.department_name })),
                ],
              },
              {
                type: "select",
                name: "table",
                label: "Table",
                defaultValue: "",
                options: [
                  { value: "", label: "All tables" },
                  ...tableNames.map((t) => ({ value: t.table_name, label: t.table_name })),
                ],
              },
              {
                type: "select",
                name: "action",
                label: "Action",
                defaultValue: "",
                options: [
                  { value: "", label: "All actions" },
                  { value: "CREATE", label: "Create" },
                  { value: "UPDATE", label: "Update" },
                  { value: "DELETE", label: "Delete" },
                ],
              },
              { type: "date", name: "from", label: "From" },
              { type: "date", name: "to", label: "To" },
            ]}
          />
        </CardContent>
      </Card>

      <AuditLogTable rows={rows} showDepartment />
    </div>
  );
}
