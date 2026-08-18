import { z } from "zod";

export const superAdminProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export type SuperAdminProfileValues = z.output<typeof superAdminProfileSchema>;
