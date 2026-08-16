import { z } from "zod";

export const smtpSettingsFormSchema = z.object({
  smtp_host: z.string().trim().min(1, "SMTP host is required").max(255),
  smtp_port: z.coerce.number().int().min(1).max(65535),
  smtp_username: z.string().trim().min(1, "SMTP username is required").max(255),
  smtp_password: z.string().trim().max(255).optional().or(z.literal("")),
  smtp_from_email: z.string().trim().email("Invalid email").max(150),
  smtp_from_name: z.string().trim().max(150).optional().or(z.literal("")),
  use_tls: z.preprocess((v) => v === "true" || v === true, z.boolean()),
});

export type SmtpSettingsFormInput = z.input<typeof smtpSettingsFormSchema>;
export type SmtpSettingsFormValues = z.output<typeof smtpSettingsFormSchema>;
