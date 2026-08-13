"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { changePasswordSchema } from "./schema";

export type ActionState = { error: string | null; success?: boolean };

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await db.users.findUniqueOrThrow({ where: { id: BigInt(user.id) } });
  const currentValid = await bcrypt.compare(parsed.data.current_password, existing.password_hash);
  if (!currentValid) {
    return { error: "Current password is incorrect." };
  }

  const password_hash = await bcrypt.hash(parsed.data.new_password, 10);
  await db.users.update({ where: { id: existing.id }, data: { password_hash } });

  await writeAuditLog({
    departmentId: existing.department_id,
    performedBy: existing.id,
    tableName: "users",
    recordId: existing.id,
    action: "UPDATE",
    reason: "Self-service password change",
  });

  return { error: null, success: true };
}
