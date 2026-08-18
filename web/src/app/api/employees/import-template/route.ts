import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { toCsv } from "@/lib/reports";

const COLUMNS = [
  "employee_name",
  "pan_number",
  "email",
  "designation",
  "employee_code",
  "dob",
  "mobile",
  "joining_date",
  "transfer_date",
  "status",
];

export async function GET() {
  try {
    await requireModulePermission("EMPLOYEE_MASTER", "create");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const csv = toCsv(COLUMNS, [
    [
      "Ramesh Kumar",
      "ABCPT1234E",
      "ramesh.kumar@example.com",
      "Junior Engineer",
      "EMP-001",
      "1985-06-15",
      "9876543210",
      "2020-04-01",
      "",
      "ACTIVE",
    ],
  ]);

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="employees-import-template.csv"` },
  });
}
