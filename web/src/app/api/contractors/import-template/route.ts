import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { toCsv } from "@/lib/reports";

const COLUMNS = [
  "firm_name",
  "vendor_code",
  "pan_number",
  "gstin",
  "address",
  "district",
  "state",
  "pin_code",
  "contact_person",
  "phone",
  "email",
  "bank_name",
  "bank_branch",
  "account_number",
  "ifsc_code",
  "account_holder_name",
  "status",
];

export async function GET() {
  try {
    await requireModulePermission("CONTRACTOR_MASTER", "create");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const csv = toCsv(COLUMNS, [
    [
      "Sunrise Constructions Pvt Ltd",
      "V-SUN01",
      "AAACS1234A",
      "29AAACS1234A1Z5",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "ACTIVE",
    ],
  ]);

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="contractors-import-template.csv"` },
  });
}
