"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { verifyUserPassword } from "@/lib/password-reset";
import { changePasswordSchema } from "./schema";

export type ActionState = { error: string | null; success?: boolean; wasForced?: boolean };

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await db.users.findUniqueOrThrow({ where: { id: BigInt(user.id) } });
  const { valid: currentValid } = await verifyUserPassword(existing, parsed.data.current_password);
  if (!currentValid) {
    return { error: "Current password is incorrect." };
  }

  const password_hash = await bcrypt.hash(parsed.data.new_password, 10);
  const wasForced = existing.must_change_password;
  await db.users.update({
    where: { id: existing.id },
    // Setting a new password retires the temp one for good, whether or not
    // it was the one just used to get here.
    data: { password_hash, must_change_password: false, reset_password_hash: null, reset_password_expires_at: null },
  });

  await writeAuditLog({
    departmentId: existing.department_id,
    performedBy: existing.id,
    tableName: "users",
    recordId: existing.id,
    action: "UPDATE",
    reason: wasForced ? "Forced password change (first login after reset)" : "Self-service password change",
  });

  return { error: null, success: true, wasForced };
}
