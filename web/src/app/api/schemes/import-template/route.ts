import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { toCsv } from "@/lib/reports";

const COLUMNS = ["scheme_name", "financial_year", "sanctioned_budget", "description", "status"];

export async function GET() {
  try {
    await requireModulePermission("SCHEME_MASTER", "create");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const csv = toCsv(COLUMNS, [["Rural Road Connectivity Scheme", "2025-2026", "50000000", "", "ACTIVE"]]);

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="schemes-import-template.csv"` },
  });
}
