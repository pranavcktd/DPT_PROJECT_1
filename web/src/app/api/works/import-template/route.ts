import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { toCsv } from "@/lib/reports";

const COLUMNS = ["work_name", "scheme_name", "financial_year", "sanctioned_cost", "expected_completion_date", "actual_completion_date", "status"];

export async function GET() {
  try {
    await requireModulePermission("WORK_MASTER", "create");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const csv = toCsv(COLUMNS, [["Village Road Upgradation", "Rural Road Connectivity Scheme", "2025-2026", "8000000", "", "", "ONGOING"]]);

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="works-import-template.csv"` },
  });
}
