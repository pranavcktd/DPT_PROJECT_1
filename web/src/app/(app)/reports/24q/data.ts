import "server-only";
import { db } from "@/lib/db";
import { quarterDateRange } from "@/lib/reports";

export async function get24qReportRows(
  departmentId: bigint,
  fy: string,
  quarter: 1 | 2 | 3 | 4,
  employeeSearch?: string,
) {
  const { start, end } = quarterDateRange(fy, quarter);

  return db.salary_payments.findMany({
    where: {
      department_id: departmentId,
      status: { not: "CANCELLED" },
      treasury_payment_date: { gte: start, lt: end },
      ...(employeeSearch
        ? { employee_name_snapshot: { contains: employeeSearch, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { treasury_payment_date: "asc" },
    select: {
      id: true,
      employee_name_snapshot: true,
      employee_pan_snapshot: true,
      gross_salary: true,
      it_deduction_amount: true,
      treasury_payment_date: true,
      payment_date_is_estimated: true,
    },
  });
}
