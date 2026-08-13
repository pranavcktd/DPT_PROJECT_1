import { z } from "zod";

export const workFormSchema = z.object({
  scheme_id: z.string().min(1, "Scheme is required"),
  work_name: z.string().trim().min(1, "Work name is required").max(200),
  sanctioned_cost: z.coerce.number().positive("Must be greater than 0"),
  expected_completion_date: z.string().optional().or(z.literal("")),
  actual_completion_date: z.string().optional().or(z.literal("")),
  status: z.enum(["ONGOING", "COMPLETED", "TERMINATED"]),
});

export type WorkFormValues = z.output<typeof workFormSchema>;
export type WorkFormInput = z.input<typeof workFormSchema>;
