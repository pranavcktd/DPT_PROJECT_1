"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { superAdminProfileSchema } from "./schema";

export type ActionState = { error: string | null; success?: boolean };

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

/**
 * Name/phone shown to any user whose department login is blocked (disabled
 * or subscription expired) - see src/app/login/actions.ts - so they know who
 * to contact. Email isn't editable here since it's also the login identity.
 */
export async function updateSuperAdminProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const parsed = superAdminProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const id = BigInt(superAdmin.id);
  const existing = await db.users.findUniqueOrThrow({ where: { id } });

  const updated = await db.users.update({
    where: { id },
    data: { name: parsed.data.name, phone: toNullable(parsed.data.phone) },
  });

  await writeAuditLog({
    departmentId: null,
    performedBy: id,
    tableName: "users",
    recordId: id,
    action: "UPDATE",
    oldData: { name: existing.name, phone: existing.phone },
    newData: { name: updated.name, phone: updated.phone },
    reason: "Super Admin self-service profile update",
  });

  revalidatePath("/super-admin/profile");
  return { error: null, success: true };
}
