"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { sendMail, SmtpNotConfiguredError } from "@/lib/mail";
import { generateTempPassword, RESET_PASSWORD_TTL_MINUTES } from "@/lib/password-reset";

export type ForgotPasswordState = { error: string | null; success?: boolean };

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");

export async function requestPasswordReset(_prev: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }
  const email = parsed.data;

  const user = await db.users.findUnique({ where: { email } });
  // Explicit, distinct "no user found" message per the site owner's request -
  // this is an internal government-department tool with a small known user
  // base, not a public consumer product, so the usual anti-enumeration
  // caution (always say "if this exists...") was deliberately traded for a
  // clearer, more helpful message here.
  if (!user) {
    return { error: "No user found with this email." };
  }
  if (user.status !== "ACTIVE") {
    return { error: "This account is not active. Contact your administrator." };
  }

  const tempPassword = generateTempPassword();
  const reset_password_hash = await bcrypt.hash(tempPassword, 10);
  const reset_password_expires_at = new Date(Date.now() + RESET_PASSWORD_TTL_MINUTES * 60 * 1000);

  await db.users.update({
    where: { id: user.id },
    data: { reset_password_hash, reset_password_expires_at },
  });

  try {
    await sendMail({
      departmentId: null,
      to: user.email,
      subject: "Your temporary password",
      html: `
        <p>Hello ${user.name},</p>
        <p>Here is a temporary password to sign back in:</p>
        <p style="font-size: 18px; font-weight: bold; letter-spacing: 1px;">${tempPassword}</p>
        <p>This temporary password is valid for ${RESET_PASSWORD_TTL_MINUTES} minutes. Your existing password still
        works too, until you actually set a new one - sign in with either, then set a new password when prompted.</p>
        <p>If you didn't request this, you can ignore this email; your existing password is unaffected.</p>
      `,
    });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) {
      return { error: "Password reset email could not be sent - contact your administrator." };
    }
    return { error: "Failed to send the password reset email. Please try again." };
  }

  await writeAuditLog({
    departmentId: user.department_id,
    performedBy: user.id,
    tableName: "users",
    recordId: user.id,
    action: "UPDATE",
    reason: "Password reset requested (self-service, forgot password)",
  });

  return { error: null, success: true };
}
