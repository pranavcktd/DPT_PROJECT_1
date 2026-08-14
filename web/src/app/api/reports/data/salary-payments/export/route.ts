import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { formatDateForReport, toCsv } from "@/lib/reports";
import { formatEnumLabel } from "@/lib/utils";
import { getSalaryPaymentsReportRows, type SalaryPaymentStatusFilter } from "@/app/(app)/reports/data/salary-payments/data";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireModulePermission("SALARY_PAYMENT_ENTRY", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "ALL") as SalaryPaymentStatusFilter;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const rows = await getSalaryPaymentsReportRows(BigInt(user.departmentId), search, status, from, to);
  const csv = toCsv(
    ["Employee", "Payment Type", "Gross Salary", "IT Deduction", "Net Payable", "Status", "Payment Date"],
    rows.map((p) => [
      p.employee_name_snapshot,
      p.payment_type === "OTHER" ? p.other_type_label : formatEnumLabel(p.payment_type),
      Number(p.gross_salary),
      Number(p.it_deduction_amount),
      Number(p.net_payable_amount ?? 0),
      p.status,
      formatDateForReport(p.treasury_payment_date),
    ]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="salary-payments-report.csv"` },
  });
}
