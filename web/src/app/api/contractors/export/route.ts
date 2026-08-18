import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { db } from "@/lib/db";
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

/** Full-field export matching the import template exactly, for backup or re-import elsewhere. */
export async function GET() {
  let user;
  try {
    user = await requireModulePermission("CONTRACTOR_MASTER", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const contractors = await db.contractors.findMany({
    where: { department_id: BigInt(user.departmentId) },
    orderBy: { firm_name: "asc" },
  });

  const csv = toCsv(
    COLUMNS,
    contractors.map((c) => [
      c.firm_name,
      c.vendor_code,
      c.pan_number,
      c.gstin,
      c.address,
      c.district,
      c.state,
      c.pin_code,
      c.contact_person,
      c.phone,
      c.email,
      c.bank_name,
      c.bank_branch,
      c.account_number,
      c.ifsc_code,
      c.account_holder_name,
      c.status,
    ]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="contractors-export.csv"` },
  });
}
