import { z } from "zod";

export const noticeFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(1000),
  department_id: z.string().optional().or(z.literal("")),
  starts_at: z.string().optional().or(z.literal("")),
  expires_at: z.string().optional().or(z.literal("")),
});

export type NoticeFormValues = z.infer<typeof noticeFormSchema>;
