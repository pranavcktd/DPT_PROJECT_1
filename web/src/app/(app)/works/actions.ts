"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { workFormSchema, type WorkFormValues } from "./schema";

export type ActionState = { error: string | null; success?: boolean };

function buildData(values: WorkFormValues) {
  return {
    scheme_id: BigInt(values.scheme_id),
    work_name: values.work_name,
    sanctioned_cost: values.sanctioned_cost,
    expected_completion_date:
      values.expected_completion_date && values.expected_completion_date.length > 0
        ? new Date(values.expected_completion_date)
        : null,
    actual_completion_date:
      values.actual_completion_date && values.actual_completion_date.length > 0
        ? new Date(values.actual_completion_date)
        : null,
    status: values.status,
  };
}

/**
 * The budget-guardrail trigger in database/schema.sql raises
 * `SIGNAL SQLSTATE '45000'` with a plain-English message on violation.
 * Verified empirically against the dev DB: Prisma surfaces this as
 * PrismaClientKnownRequestError code P2039, with the original trigger
 * message preserved inline in error.message - so we match on known trigger
 * phrasing, and rethrow anything unrecognized so real bugs stay visible.
 */
function friendlyErrorFor(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("exceeds remaining scheme budget")) {
    return "Sanctioned cost exceeds the remaining budget for this scheme.";
  }
  throw error;
}

export async function createWork(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("WORK_MASTER", "create");
  const parsed = workFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const scheme = await db.schemes.findFirst({
    where: { id: BigInt(parsed.data.scheme_id), department_id: BigInt(user.departmentId) },
  });
  if (!scheme) return { error: "Scheme not found." };

  try {
    const work = await db.works.create({
      data: {
        department_id: BigInt(user.departmentId),
        created_by: BigInt(user.id),
        ...buildData(parsed.data),
      },
    });

    await writeAuditLog({
      departmentId: work.department_id,
      performedBy: BigInt(user.id),
      tableName: "works",
      recordId: work.id,
      action: "CREATE",
      newData: work,
    });
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }

  revalidatePath("/works");
  revalidatePath("/schemes");
  return { error: null, success: true };
}

export async function updateWork(workId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("WORK_MASTER", "edit");
  const parsed = workFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const id = BigInt(workId);
  const existing = await db.works.findFirst({ where: { id, department_id: BigInt(user.departmentId) } });
  if (!existing) return { error: "Work order not found." };

  try {
    const updated = await db.works.update({
      where: { id },
      data: buildData(parsed.data),
    });

    await writeAuditLog({
      departmentId: updated.department_id,
      performedBy: BigInt(user.id),
      tableName: "works",
      recordId: updated.id,
      action: "UPDATE",
      oldData: existing,
      newData: updated,
    });
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }

  revalidatePath("/works");
  revalidatePath("/schemes");
  return { error: null, success: true };
}
