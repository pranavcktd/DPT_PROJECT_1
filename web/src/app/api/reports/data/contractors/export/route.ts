import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { toCsv } from "@/lib/reports";
import { getContractorsReportRows, type ContractorStatusFilter } from "@/app/(app)/reports/data/contractors/data";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireModulePermission("CONTRACTOR_MASTER", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "ALL") as ContractorStatusFilter;

  const rows = await getContractorsReportRows(BigInt(user.departmentId), search, status);
  const csv = toCsv(
    ["Firm Name", "PAN", "GSTIN", "Vendor Code", "Phone", "Email", "Status"],
    rows.map((c) => [c.firm_name, c.pan_number, c.gstin, c.vendor_code, c.phone, c.email, c.status]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="contractors-report.csv"` },
  });
}
