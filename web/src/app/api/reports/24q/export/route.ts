import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { FY_QUARTERS, currentFinancialYear, formatDateForReport, toCsv } from "@/lib/reports";
import { get24qReportRows } from "@/app/(app)/reports/24q/data";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireModulePermission("TAX_LEDGER_REPORT", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const fy = searchParams.get("fy") ?? currentFinancialYear();
  const quarter = (Number(searchParams.get("quarter")) || 1) as 1 | 2 | 3 | 4;
  const employee = searchParams.get("employee") ?? undefined;

  const departmentId = BigInt(user.departmentId);
  const rows = await get24qReportRows(departmentId, fy, quarter, employee);

  const csv = toCsv(
    ["Employee Name", "PAN", "Gross Salary", "Total IT TDS Deducted", "Token Generated Date", "Reconciled Date"],
    rows.map((r) => [
      r.employee_name_snapshot,
      r.employee_pan_snapshot,
      Number(r.gross_salary),
      Number(r.it_deduction_amount ?? 0),
      formatDateForReport(r.token_generated_date),
      formatDateForReport(r.actual_payment_date),
    ]),
  );

  const quarterLabel = FY_QUARTERS[quarter - 1].label.split(" ")[0];
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="TDS-24Q-${fy}-${quarterLabel}.csv"`,
    },
  });
}
