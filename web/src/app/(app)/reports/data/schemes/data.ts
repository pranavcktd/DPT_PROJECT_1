import "server-only";
import { db } from "@/lib/db";

export type SchemeStatusFilter = "ALL" | "ACTIVE" | "CLOSED";

export async function getSchemesReportRows(departmentId: bigint, search: string, status: SchemeStatusFilter) {
  const [schemes, allocations] = await Promise.all([
    db.schemes.findMany({
      where: {
        department_id: departmentId,
        ...(status !== "ALL" ? { status } : {}),
        ...(search ? { scheme_name: { contains: search, mode: "insensitive" as const } } : {}),
      },
      orderBy: [{ financial_year: "desc" }, { scheme_name: "asc" }],
    }),
    db.works.groupBy({
      by: ["scheme_id"],
      where: { department_id: departmentId, status: { not: "TERMINATED" } },
      _sum: { sanctioned_cost: true },
    }),
  ]);
  const allocatedByScheme = new Map(allocations.map((a) => [a.scheme_id.toString(), Number(a._sum.sanctioned_cost ?? 0)]));
  return schemes.map((s) => ({
    ...s,
    allocated: allocatedByScheme.get(s.id.toString()) ?? 0,
  }));
}
