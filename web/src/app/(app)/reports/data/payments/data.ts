import "server-only";
import { db } from "@/lib/db";

export type PaymentStatusFilter = "ALL" | "SAVED" | "APPROVED" | "CANCELLED";

export async function getPaymentsReportRows(
  departmentId: bigint,
  search: string,
  status: PaymentStatusFilter,
  from: string,
  to: string,
) {
  return db.payments.findMany({
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
      ...(search
        ? {
            OR: [
              { invoice_number: { contains: search, mode: "insensitive" as const } },
              { contractor_name_snapshot: { contains: search, mode: "insensitive" as const } },
              { work_name_snapshot: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { created_at: "desc" },
  });
}
