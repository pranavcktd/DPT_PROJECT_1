import "server-only";
import { db } from "@/lib/db";

export type ContractorStatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "BLACKLISTED";

export async function getContractorsReportRows(departmentId: bigint, search: string, status: ContractorStatusFilter) {
  return db.contractors.findMany({
    where: {
      department_id: departmentId,
      ...(status !== "ALL" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { firm_name: { contains: search, mode: "insensitive" as const } },
              { pan_number: { contains: search, mode: "insensitive" as const } },
              { gstin: { contains: search, mode: "insensitive" as const } },
              { vendor_code: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { firm_name: "asc" },
  });
}
