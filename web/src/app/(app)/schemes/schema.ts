import { z } from "zod";

export const schemeFormSchema = z.object({
  scheme_name: z.string().trim().min(1, "Scheme name is required").max(200),
  financial_year: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, "Use the format 2025-2026"),
  sanctioned_budget: z.coerce.number().positive("Must be greater than 0"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export type SchemeFormValues = z.output<typeof schemeFormSchema>;
export type SchemeFormInput = z.input<typeof schemeFormSchema>;
