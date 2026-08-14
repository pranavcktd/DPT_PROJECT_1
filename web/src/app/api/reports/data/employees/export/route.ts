import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { formatDateForReport, toCsv } from "@/lib/reports";
import { getEmployeesReportRows, type EmployeeStatusFilter } from "@/app/(app)/reports/data/employees/data";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireModulePermission("EMPLOYEE_MASTER", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "ALL") as EmployeeStatusFilter;

  const rows = await getEmployeesReportRows(BigInt(user.departmentId), search, status);
  const csv = toCsv(
    ["Employee Name", "PAN", "Mobile", "Joining Date", "Transfer Date", "Status"],
    rows.map((e) => [e.employee_name, e.pan_number, e.mobile, formatDateForReport(e.joining_date), formatDateForReport(e.transfer_date), e.status]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="employees-report.csv"` },
  });
}
