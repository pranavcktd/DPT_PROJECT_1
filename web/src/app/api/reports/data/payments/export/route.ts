import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { formatDateForReport, toCsv } from "@/lib/reports";
import { getPaymentsReportRows, type PaymentStatusFilter } from "@/app/(app)/reports/data/payments/data";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireModulePermission("PAYMENT_ENTRY", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "ALL") as PaymentStatusFilter;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const rows = await getPaymentsReportRows(BigInt(user.departmentId), search, status, from, to);
  const csv = toCsv(
    ["Invoice Number", "Contractor", "Work", "Base Cost", "Net Payable", "Status", "Invoice Date", "Treasury Date"],
    rows.map((p) => [
      p.invoice_number,
      p.contractor_name_snapshot,
      p.work_name_snapshot,
      Number(p.base_cost),
      Number(p.net_payable_amount ?? 0),
      p.status,
      formatDateForReport(p.invoice_date),
      formatDateForReport(p.treasury_payment_date),
    ]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="non-salary-payments-report.csv"` },
  });
}
