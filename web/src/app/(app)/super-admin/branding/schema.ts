import { z } from "zod";

export const brandingFormSchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required").max(150),
  tagline: z.string().trim().min(1, "Tagline is required").max(255),
  contact_email: z.string().trim().max(150).email("Enter a valid email").or(z.literal("")),
  contact_phone: z.string().trim().max(20),
});

export type BrandingFormValues = z.infer<typeof brandingFormSchema>;
