import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { toCsv } from "@/lib/reports";

const COLUMNS = ["employee_pan", "payment_type", "other_type_label", "gross_salary", "it_deduction_amount", "treasury_token_number", "treasury_payment_date", "remarks"];

export async function GET() {
  try {
    await requireModulePermission("SALARY_PAYMENT_ENTRY", "create");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const csv = toCsv(COLUMNS, [
    ["ABCPT1234E", "SALARY", "", "50000", "5000", "TKN-001", "2026-08-10", ""],
    ["ABCPT1234E", "OTHER", "Festival Bonus", "10000", "0", "TKN-002", "2026-08-10", ""],
  ]);

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="salary-payments-import-template.csv"` },
  });
}
