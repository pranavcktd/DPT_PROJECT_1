"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { schemeFormSchema, type SchemeFormValues } from "./schema";

export type ActionState = { error: string | null; success?: boolean };

function buildData(values: SchemeFormValues) {
  return {
    scheme_name: values.scheme_name,
    financial_year: values.financial_year,
    sanctioned_budget: values.sanctioned_budget,
    description: values.description && values.description.length > 0 ? values.description : null,
    status: values.status,
  };
}

function friendlyErrorFor(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A scheme with this name already exists for this financial year.";
  }
  throw error;
}

export async function createScheme(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("SCHEME_MASTER", "create");
  const parsed = schemeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const scheme = await db.schemes.create({
      data: {
        department_id: BigInt(user.departmentId),
        created_by: BigInt(user.id),
        ...buildData(parsed.data),
      },
    });

    await writeAuditLog({
      departmentId: scheme.department_id,
      performedBy: BigInt(user.id),
      tableName: "schemes",
      recordId: scheme.id,
      action: "CREATE",
      newData: scheme,
    });
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }

  revalidatePath("/schemes");
  return { error: null, success: true };
}

export async function updateScheme(schemeId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("SCHEME_MASTER", "edit");
  const parsed = schemeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const id = BigInt(schemeId);
  const existing = await db.schemes.findFirst({ where: { id, department_id: BigInt(user.departmentId) } });
  if (!existing) return { error: "Scheme not found." };

  if (parsed.data.sanctioned_budget < Number(existing.sanctioned_budget)) {
    const allocated = await db.works.aggregate({
      where: { scheme_id: id, status: { not: "TERMINATED" } },
      _sum: { sanctioned_cost: true },
    });
    const allocatedTotal = Number(allocated._sum.sanctioned_cost ?? 0);
    if (parsed.data.sanctioned_budget < allocatedTotal) {
      return {
        error: `Cannot reduce budget below ₹${allocatedTotal.toLocaleString("en-IN")} already allocated to work orders.`,
      };
    }
  }

  try {
    const updated = await db.schemes.update({
      where: { id },
      data: buildData(parsed.data),
    });

    await writeAuditLog({
      departmentId: updated.department_id,
      performedBy: BigInt(user.id),
      tableName: "schemes",
      recordId: updated.id,
      action: "UPDATE",
      oldData: existing,
      newData: updated,
    });
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }

  revalidatePath("/schemes");
  return { error: null, success: true };
}
