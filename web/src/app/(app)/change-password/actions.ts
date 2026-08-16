"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { changePasswordSchema } from "./schema";

export type ActionState = { error: string | null; success?: boolean; wasForced?: boolean };

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
  const wasForced = existing.must_change_password;
  await db.users.update({
    where: { id: existing.id },
    data: { password_hash, must_change_password: false },
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
