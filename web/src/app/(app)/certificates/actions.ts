"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { workExperienceCertificateSchema } from "./schema";

export type ActionState = { error: string | null; success?: boolean; certificateId?: string };

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

export async function issueWorkExperienceCertificate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("WORK_EXPERIENCE_CERTIFICATE", "create");
  const parsed = workExperienceCertificateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const values = parsed.data;
  const departmentId = BigInt(user.departmentId);

  const [work, contractor] = await Promise.all([
    db.works.findFirst({ where: { id: BigInt(values.work_id), department_id: departmentId } }),
    db.contractors.findFirst({ where: { id: BigInt(values.contractor_id), department_id: departmentId } }),
  ]);
  if (!work) return { error: "Work order not found." };
  if (!contractor) return { error: "Contractor not found." };

  try {
    const certificate = await db.work_experience_certificates.create({
      data: {
        department_id: departmentId,
        work_id: work.id,
        contractor_id: contractor.id,
        certificate_number: values.certificate_number,
        stated_completion_date: values.stated_completion_date ? new Date(values.stated_completion_date) : null,
        actual_completion_date: values.actual_completion_date ? new Date(values.actual_completion_date) : null,
        sanctioned_value: values.sanctioned_value,
        executed_value: values.executed_value,
        performance_rating_label: values.performance_rating_label,
        performance_rating_score: values.performance_rating_score ?? null,
        remarks: toNullable(values.remarks),
        issued_by: BigInt(user.id),
      },
    });

    await writeAuditLog({
      departmentId,
      performedBy: BigInt(user.id),
      tableName: "work_experience_certificates",
      recordId: certificate.id,
      action: "CREATE",
      newData: certificate,
    });

    revalidatePath("/certificates");
    return { error: null, success: true, certificateId: certificate.id.toString() };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "This certificate number is already in use." };
    }
    throw error;
  }
}
