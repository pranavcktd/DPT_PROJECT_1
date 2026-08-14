import "server-only";
import { db } from "@/lib/db";

export type WorkStatusFilter = "ALL" | "ONGOING" | "COMPLETED" | "TERMINATED";

export async function getWorksReportRows(departmentId: bigint, search: string, status: WorkStatusFilter) {
  return db.works.findMany({
    where: {
      department_id: departmentId,
      ...(status !== "ALL" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { work_name: { contains: search, mode: "insensitive" as const } },
              { schemes: { scheme_name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { schemes: { select: { scheme_name: true } } },
    orderBy: { created_at: "desc" },
  });
}
