import "server-only";
import { db } from "@/lib/db";

export async function getCertificatesReportRows(departmentId: bigint, search: string) {
  return db.work_experience_certificates.findMany({
    where: {
      department_id: departmentId,
      ...(search
        ? {
            OR: [
              { certificate_number: { contains: search, mode: "insensitive" as const } },
              { contractors: { firm_name: { contains: search, mode: "insensitive" as const } } },
              { works: { work_name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { works: { select: { work_name: true } }, contractors: { select: { firm_name: true } } },
    orderBy: { issued_at: "desc" },
  });
}
