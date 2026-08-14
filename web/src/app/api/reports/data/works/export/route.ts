import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { toCsv } from "@/lib/reports";
import { getWorksReportRows, type WorkStatusFilter } from "@/app/(app)/reports/data/works/data";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireModulePermission("WORK_MASTER", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "ALL") as WorkStatusFilter;

  const rows = await getWorksReportRows(BigInt(user.departmentId), search, status);
  const csv = toCsv(
    ["Work Name", "Scheme", "Sanctioned Cost", "Status"],
    rows.map((w) => [w.work_name, w.schemes.scheme_name, Number(w.sanctioned_cost), w.status]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="works-report.csv"` },
  });
}
