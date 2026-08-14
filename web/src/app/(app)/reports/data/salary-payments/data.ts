import "server-only";
import { db } from "@/lib/db";

export type SalaryPaymentStatusFilter = "ALL" | "SAVED" | "APPROVED" | "CANCELLED";

export async function getSalaryPaymentsReportRows(
  departmentId: bigint,
  search: string,
  status: SalaryPaymentStatusFilter,
  from: string,
  to: string,
) {
  return db.salary_payments.findMany({
    where: {
      department_id: departmentId,
      ...(status !== "ALL" ? { status } : {}),
      ...(from || to
        ? {
            treasury_payment_date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(search ? { employee_name_snapshot: { contains: search, mode: "insensitive" as const } } : {}),
    },
    orderBy: { created_at: "desc" },
  });
}
