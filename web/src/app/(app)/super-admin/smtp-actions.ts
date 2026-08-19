"use server";

import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { smtpSettingsFormSchema } from "../department/smtp-schema";

export type ActionState = { error: string | null; success?: boolean };

export async function upsertSuperAdminSmtpSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const parsed = smtpSettingsFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const values = parsed.data;

  const existing = await db.smtp_settings.findFirst({ where: { department_id: null } });

  // Same "blank means keep existing" convention as the department SMTP form -
  // the password is never round-tripped in plaintext to the client.
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
    updated_by: BigInt(superAdmin.id),
  };

  if (existing) {
    await db.smtp_settings.update({ where: { id: existing.id }, data });
  } else {
    await db.smtp_settings.create({ data: { department_id: null, ...data } });
  }

  revalidatePath("/super-admin/profile");
  return { error: null, success: true };
}

/** Sends a test email to the Super Admin's own account so they can confirm SMTP works. */
export async function sendSuperAdminTestEmail(_prev: ActionState): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();

  const settings = await db.smtp_settings.findFirst({ where: { department_id: null } });
  if (!settings) return { error: "Save SMTP settings before sending a test email." };

  const testUser = await db.users.findUniqueOrThrow({ where: { id: BigInt(superAdmin.id) } });

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
      html: "<p>This is a test email from your government contract &amp; payment management system Super Admin account. If you received this, your SMTP settings are working correctly.</p>",
    });
  } catch (error) {
    return { error: error instanceof Error ? `Failed to send: ${error.message}` : "Failed to send test email." };
  }

  return { error: null, success: true };
}
