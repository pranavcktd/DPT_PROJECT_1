import "server-only";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

export class SmtpNotConfiguredError extends Error {
  constructor() {
    super("Email is not set up for this department yet. Ask your Department Admin to add SMTP settings under Department Profile.");
  }
}

export async function sendMail(params: {
  departmentId: bigint;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}) {
  const settings = await db.smtp_settings.findUnique({ where: { department_id: params.departmentId } });
  if (!settings) throw new SmtpNotConfiguredError();

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: settings.smtp_port === 465,
    requireTLS: settings.use_tls && settings.smtp_port !== 465,
    auth: { user: settings.smtp_username, pass: decryptSecret(settings.smtp_password_cipher) },
  });

  await transporter.sendMail({
    from: settings.smtp_from_name ? `"${settings.smtp_from_name}" <${settings.smtp_from_email}>` : settings.smtp_from_email,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  });
}
