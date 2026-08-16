import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateForReport, toCsv } from "@/lib/reports";

const COLUMNS = [
  "work_name",
  "contractor_pan",
  "contractor_name",
  "agreement_number",
  "agreement_date",
  "invoice_number",
  "invoice_date",
  "base_cost",
  "gst_rate",
  "it_tds_rate",
  "gst_tds_rate",
  "gst_tds_type",
  "labour_cess_rate",
  "royalty_type",
  "royalty_value",
  "stamp_duty_type",
  "stamp_duty_value",
  "other_deduction_type",
  "other_deduction_value",
  "other_deduction_remarks",
  "total_bill_value",
  "total_deductions",
  "net_payable_amount",
  "pay_mode",
  "treasury_token_number",
  "token_generated_date",
  "actual_payment_date",
  "treasury_payment_date",
  "payment_date_is_estimated",
  "status",
  "remarks",
];

export async function GET() {
  let user;
  try {
    user = await requireModulePermission("PAYMENT_ENTRY", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const payments = await db.payments.findMany({
    where: { department_id: BigInt(user.departmentId) },
    orderBy: { created_at: "desc" },
  });

  const csv = toCsv(
    COLUMNS,
    payments.map((p) => [
      p.work_name_snapshot,
      p.contractor_pan_snapshot,
      p.contractor_name_snapshot,
      p.agreement_number_snapshot,
      formatDateForReport(p.agreement_date_snapshot),
      p.invoice_number,
      formatDateForReport(p.invoice_date),
      Number(p.base_cost),
      Number(p.gst_rate),
      Number(p.it_tds_rate),
      Number(p.gst_tds_rate),
      p.gst_tds_type,
      Number(p.labour_cess_rate),
      p.royalty_type,
      Number(p.royalty_value),
      p.stamp_duty_type,
      Number(p.stamp_duty_value),
      p.other_deduction_type,
      Number(p.other_deduction_value),
      p.other_deduction_remarks,
      Number(p.total_bill_value ?? 0),
      Number(p.total_deductions ?? 0),
      Number(p.net_payable_amount ?? 0),
      p.pay_mode,
      p.treasury_token_number,
      formatDateForReport(p.token_generated_date),
      formatDateForReport(p.actual_payment_date),
      formatDateForReport(p.treasury_payment_date),
      p.payment_date_is_estimated ? "YES" : "NO",
      p.status,
      p.remarks,
    ]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="payments-export.csv"` },
  });
}
