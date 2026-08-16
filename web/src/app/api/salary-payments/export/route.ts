import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateForReport, toCsv } from "@/lib/reports";

const COLUMNS = ["employee_pan", "employee_name", "payment_type", "other_type_label", "gross_salary", "it_deduction_amount", "net_payable_amount", "treasury_token_number", "treasury_payment_date", "status", "remarks"];

export async function GET() {
  let user;
  try {
    user = await requireModulePermission("SALARY_PAYMENT_ENTRY", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const payments = await db.salary_payments.findMany({
    where: { department_id: BigInt(user.departmentId) },
    orderBy: { created_at: "desc" },
  });

  const csv = toCsv(
    COLUMNS,
    payments.map((p) => [
      p.employee_pan_snapshot,
      p.employee_name_snapshot,
      p.payment_type,
      p.other_type_label,
      Number(p.gross_salary),
      Number(p.it_deduction_amount),
      Number(p.net_payable_amount ?? 0),
      p.treasury_token_number,
      formatDateForReport(p.treasury_payment_date),
      p.status,
      p.remarks,
    ]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="salary-payments-export.csv"` },
  });
}
