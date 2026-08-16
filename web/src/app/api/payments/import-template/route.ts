import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { toCsv } from "@/lib/reports";

const COLUMNS = [
  "work_name",
  "contractor_pan",
  "agreement_number",
  "agreement_date",
  "invoice_number",
  "invoice_date",
  "base_cost",
  "gst_rate",
  "it_tds_rate",
  "gst_tds_rate",
  "labour_cess_rate",
  "royalty_type",
  "royalty_value",
  "stamp_duty_type",
  "stamp_duty_value",
  "other_deduction_type",
  "other_deduction_value",
  "other_deduction_remarks",
  "pay_mode",
  "treasury_token_number",
  "token_generated_date",
  "actual_payment_date",
  "remarks",
];

export async function GET() {
  try {
    await requireModulePermission("PAYMENT_ENTRY", "create");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const csv = toCsv(COLUMNS, [
    [
      "Village Road Upgradation", "ABCPT9876Q", "AGR-2026-001", "2026-01-15",
      "INV-2026-001", "2026-02-01", "400000",
      "18", "2", "2", "1",
      "NOT_APPLICABLE", "0", "NOT_APPLICABLE", "0", "NOT_APPLICABLE", "0", "",
      "TREASURY", "TKN-2026-001", "2026-02-05", "", "",
    ],
  ]);

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="payments-import-template.csv"` },
  });
}
