import { z } from "zod";

export const PERFORMANCE_RATINGS = ["OUTSTANDING", "EXCELLENT", "GOOD", "SATISFACTORY", "POOR"] as const;

export const workExperienceCertificateSchema = z.object({
  work_id: z.string().min(1, "Work order is required"),
  contractor_id: z.string().min(1, "Contractor is required"),
  certificate_number: z.string().trim().min(1, "Certificate number is required").max(50),
  stated_completion_date: z.string().optional().or(z.literal("")),
  actual_completion_date: z.string().optional().or(z.literal("")),
  sanctioned_value: z.coerce.number().positive("Must be greater than 0"),
  executed_value: z.coerce.number().min(0),
  performance_rating_label: z.enum(PERFORMANCE_RATINGS),
  performance_rating_score: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().min(0).max(10).optional(),
  ),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});

export type WorkExperienceCertificateValues = z.output<typeof workExperienceCertificateSchema>;
export type WorkExperienceCertificateInput = z.input<typeof workExperienceCertificateSchema>;
