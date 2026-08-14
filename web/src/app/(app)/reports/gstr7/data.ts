import "server-only";
import { db } from "@/lib/db";
import { monthDateRange } from "@/lib/reports";

export async function getGstr7ReportRows(
  departmentId: bigint,
  year: number,
  month: number,
  contractorSearch?: string,
) {
  const { start, end } = monthDateRange(year, month);

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
    include: { contractors: { select: { phone: true } } },
  });
}
