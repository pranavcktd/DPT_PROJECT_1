import "server-only";
import { db } from "@/lib/db";

export type EmployeeStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export async function getEmployeesReportRows(departmentId: bigint, search: string, status: EmployeeStatusFilter) {
  return db.employees.findMany({
    where: {
      department_id: departmentId,
      ...(status !== "ALL" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { employee_name: { contains: search, mode: "insensitive" as const } },
              { pan_number: { contains: search, mode: "insensitive" as const } },
              { mobile: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { employee_name: "asc" },
  });
}
