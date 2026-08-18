import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { MONTHS, formatDateForReport, toCsv } from "@/lib/reports";
import { getGstr7ReportRows } from "@/app/(app)/reports/gstr7/data";

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
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getUTCFullYear();
  const month = Number(searchParams.get("month")) || now.getUTCMonth() + 1;
  const contractor = searchParams.get("contractor") ?? undefined;

  const departmentId = BigInt(user.departmentId);
  const rows = await getGstr7ReportRows(departmentId, year, month, contractor);

  const csv = toCsv(
    [
      "Contractor Name",
      "GSTIN",
      "Invoice Number",
      "Invoice Date",
      "Token Generated Date",
      "Reconciled Date",
      "Total Bill Value (C)",
      "Mobile Number",
      "Base Cost (A)",
      "IGST",
      "CGST",
      "SGST",
    ],
    rows.map((r) => [
      r.contractor_name_snapshot,
      r.contractor_gstin_snapshot,
      r.invoice_number,
      formatDateForReport(r.invoice_date),
      formatDateForReport(r.token_generated_date),
      formatDateForReport(r.actual_payment_date),
      Number(r.total_bill_value ?? 0),
      r.contractors.phone,
      Number(r.base_cost),
      Number(r.igst_tds_amount ?? 0),
      Number(r.cgst_tds_amount ?? 0),
      Number(r.sgst_tds_amount ?? 0),
    ]),
  );

  const monthLabel = MONTHS[month - 1].label;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="GSTR7-${monthLabel}-${year}.csv"`,
    },
  });
}
