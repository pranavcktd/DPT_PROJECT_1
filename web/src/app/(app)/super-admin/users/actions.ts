"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { DEFAULT_PASSWORD } from "@/lib/auth-constants";

export type ActionState = { error: string | null; success?: boolean };

/**
 * Fallback path for when a Department Admin is themselves locked out (forgot
 * password, accidentally suspended their own account, etc.) and has no one
 * within their department who can fix it - Super Admin can act on any
 * department-scoped user directly. Other Super Admin accounts are excluded
 * from both actions below so this can't be used to lock out software-company
 * staff.
 */
async function findManagedUser(userId: string) {
  const user = await db.users.findFirst({
    where: { id: BigInt(userId), department_id: { not: null } },
  });
  return user;
}

export async function resetUserPassword(userId: string): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const existing = await findManagedUser(userId);
  if (!existing) return { error: "User not found." };

  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await db.users.update({
    where: { id: existing.id },
    data: { password_hash, must_change_password: true },
  });

  await writeAuditLog({
    departmentId: existing.department_id,
    performedBy: BigInt(superAdmin.id),
    tableName: "users",
    recordId: existing.id,
    action: "UPDATE",
    reason: "Password reset to default by Super Admin",
  });

  revalidatePath("/super-admin/users");
  return { error: null, success: true };
}

export async function setUserStatus(userId: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const existing = await findManagedUser(userId);
  if (!existing) return { error: "User not found." };

  const updated = await db.users.update({
    where: { id: existing.id },
    data: { status },
  });

  await writeAuditLog({
    departmentId: existing.department_id,
    performedBy: BigInt(superAdmin.id),
    tableName: "users",
    recordId: existing.id,
    action: "UPDATE",
    oldData: existing,
    newData: updated,
    reason: `Status changed to ${status} by Super Admin`,
  });

  revalidatePath("/super-admin/users");
  return { error: null, success: true };
}
