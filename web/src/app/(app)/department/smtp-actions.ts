"use server";

import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { smtpSettingsFormSchema } from "./smtp-schema";

export type ActionState = { error: string | null; success?: boolean };

export async function upsertSmtpSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("DEPARTMENT_SETTINGS", "edit");
  const parsed = smtpSettingsFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const departmentId = BigInt(user.departmentId);
  const values = parsed.data;

  const existing = await db.smtp_settings.findUnique({ where: { department_id: departmentId } });

  // Password field is left blank on the form after saving (never round-tripped
  // in plaintext to the client) - a blank submission means "keep the existing
  // password", not "clear it". A first-time setup with no password entered is
  // rejected below since there'd be nothing to encrypt.
  let passwordCipher: string;
  if (values.smtp_password) {
    passwordCipher = encryptSecret(values.smtp_password);
  } else if (existing) {
    passwordCipher = existing.smtp_password_cipher;
  } else {
    return { error: "SMTP password is required for first-time setup." };
  }

  const data = {
    smtp_host: values.smtp_host,
    smtp_port: values.smtp_port,
    smtp_username: values.smtp_username,
    smtp_password_cipher: passwordCipher,
    smtp_from_email: values.smtp_from_email,
    smtp_from_name: values.smtp_from_name && values.smtp_from_name.length > 0 ? values.smtp_from_name : null,
    use_tls: values.use_tls,
    updated_by: BigInt(user.id),
  };

  await db.smtp_settings.upsert({
    where: { department_id: departmentId },
    update: data,
    create: { department_id: departmentId, ...data },
  });

  revalidatePath("/department");
  return { error: null, success: true };
}

/** Sends a test email to the department's own official/admin email so the admin can confirm SMTP works without needing a real report to send. */
export async function sendTestEmail(_prev: ActionState): Promise<ActionState> {
  const user = await requireModulePermission("DEPARTMENT_SETTINGS", "edit");
  const departmentId = BigInt(user.departmentId);

  const settings = await db.smtp_settings.findUnique({ where: { department_id: departmentId } });
  if (!settings) return { error: "Save SMTP settings before sending a test email." };

  const testUser = await db.users.findUniqueOrThrow({ where: { id: BigInt(user.id) } });

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_port === 465,
      requireTLS: settings.use_tls && settings.smtp_port !== 465,
      auth: { user: settings.smtp_username, pass: decryptSecret(settings.smtp_password_cipher) },
    });
    await transporter.sendMail({
      from: settings.smtp_from_name ? `"${settings.smtp_from_name}" <${settings.smtp_from_email}>` : settings.smtp_from_email,
      to: testUser.email,
      subject: "Test email - SMTP settings working",
      html: "<p>This is a test email from your government contract &amp; payment management system. If you received this, your SMTP settings are working correctly.</p>",
    });
  } catch (error) {
    return { error: error instanceof Error ? `Failed to send: ${error.message}` : "Failed to send test email." };
  }

  return { error: null, success: true };
}
