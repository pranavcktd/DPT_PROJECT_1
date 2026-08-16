import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateForReport, toCsv } from "@/lib/reports";

const COLUMNS = ["work_name", "scheme_name", "financial_year", "sanctioned_cost", "expected_completion_date", "actual_completion_date", "status"];

export async function GET() {
  let user;
  try {
    user = await requireModulePermission("WORK_MASTER", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const works = await db.works.findMany({
    where: { department_id: BigInt(user.departmentId) },
    include: { schemes: { select: { scheme_name: true, financial_year: true } } },
    orderBy: { work_name: "asc" },
  });

  const csv = toCsv(
    COLUMNS,
    works.map((w) => [
      w.work_name,
      w.schemes.scheme_name,
      w.schemes.financial_year,
      Number(w.sanctioned_cost),
      formatDateForReport(w.expected_completion_date),
      formatDateForReport(w.actual_completion_date),
      w.status,
    ]),
  );

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="works-export.csv"` },
  });
}
