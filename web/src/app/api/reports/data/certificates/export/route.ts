import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { formatDateForReport, toCsv } from "@/lib/reports";
import { formatEnumLabel } from "@/lib/utils";
import { getCertificatesReportRows } from "@/app/(app)/reports/data/certificates/data";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireModulePermission("WORK_EXPERIENCE_CERTIFICATE", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") ?? "";

  const rows = await getCertificatesReportRows(BigInt(user.departmentId), search);
  const csv = toCsv(
    ["Certificate Number", "Contractor", "Work", "Executed Value", "Rating", "Issued"],
    rows.map((c) => [
      c.certificate_number,
      c.contractors.firm_name,
      c.works.work_name,
      Number(c.executed_value),
      c.performance_rating_label ? formatEnumLabel(c.performance_rating_label) : null,
      formatDateForReport(c.issued_at),
    ]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="certificates-report.csv"` },
  });
}
