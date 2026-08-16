import "server-only";
import { db } from "@/lib/db";

export async function getContractorCertificateRows(departmentId: bigint, contractorId: bigint, from: string, to: string) {
  return db.payments.findMany({
    where: {
      department_id: departmentId,
      contractor_id: contractorId,
      status: { not: "CANCELLED" },
      ...(from || to
        ? {
            treasury_payment_date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { treasury_payment_date: "asc" },
  });
}
