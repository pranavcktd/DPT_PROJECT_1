import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateForReport, toCsv } from "@/lib/reports";

const COLUMNS = ["employee_name", "pan_number", "dob", "mobile", "joining_date", "transfer_date", "status"];

/** Full-field export matching the import template exactly, for backup or re-import elsewhere. */
export async function GET() {
  let user;
  try {
    user = await requireModulePermission("EMPLOYEE_MASTER", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const employees = await db.employees.findMany({
    where: { department_id: BigInt(user.departmentId) },
    orderBy: { employee_name: "asc" },
  });

  const csv = toCsv(
    COLUMNS,
    employees.map((e) => [
      e.employee_name,
      e.pan_number,
      formatDateForReport(e.dob),
      e.mobile,
      formatDateForReport(e.joining_date),
      formatDateForReport(e.transfer_date),
      e.status,
    ]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="employees-export.csv"` },
  });
}
