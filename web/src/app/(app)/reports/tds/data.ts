import "server-only";
import { db } from "@/lib/db";
import { quarterDateRange } from "@/lib/reports";

export async function getTdsReportRows(
  departmentId: bigint,
  fy: string,
  quarter: 1 | 2 | 3 | 4,
  contractorSearch?: string,
) {
  const { start, end } = quarterDateRange(fy, quarter);

  return db.payments.findMany({
    where: {
      department_id: departmentId,
      status: { not: "CANCELLED" },
      treasury_payment_date: { gte: start, lt: end },
      ...(contractorSearch
        ? { contractor_name_snapshot: { contains: contractorSearch, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { treasury_payment_date: "asc" },
    select: {
      id: true,
      contractor_name_snapshot: true,
      contractor_pan_snapshot: true,
      base_cost: true,
      it_tds_amount: true,
      treasury_payment_date: true,
    },
  });
}
