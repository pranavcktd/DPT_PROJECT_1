import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/reports";

const COLUMNS = ["scheme_name", "financial_year", "sanctioned_budget", "description", "status"];

export async function GET() {
  let user;
  try {
    user = await requireModulePermission("SCHEME_MASTER", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const schemes = await db.schemes.findMany({
    where: { department_id: BigInt(user.departmentId) },
    orderBy: { scheme_name: "asc" },
  });

  const csv = toCsv(
    COLUMNS,
    schemes.map((s) => [s.scheme_name, s.financial_year, Number(s.sanctioned_budget), s.description, s.status]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="schemes-export.csv"` },
  });
}
