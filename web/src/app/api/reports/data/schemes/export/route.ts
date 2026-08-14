import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { toCsv } from "@/lib/reports";
import { getSchemesReportRows, type SchemeStatusFilter } from "@/app/(app)/reports/data/schemes/data";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireModulePermission("SCHEME_MASTER", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "ALL") as SchemeStatusFilter;

  const rows = await getSchemesReportRows(BigInt(user.departmentId), search, status);
  const csv = toCsv(
    ["Scheme Name", "Financial Year", "Sanctioned Budget", "Allocated", "Remaining", "Status"],
    rows.map((s) => {
      const sanctioned = Number(s.sanctioned_budget);
      return [s.scheme_name, s.financial_year, sanctioned, s.allocated, sanctioned - s.allocated, s.status];
    }),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="schemes-report.csv"` },
  });
}
