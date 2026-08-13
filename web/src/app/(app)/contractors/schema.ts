import { z } from "zod";

export const contractorFormSchema = z.object({
  firm_name: z.string().trim().min(1, "Firm name is required").max(150),
  vendor_code: z.string().trim().max(30).optional().or(z.literal("")),
  pan_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN must be in the format AAAAA0000A"),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z0-9]{13}$/, "GSTIN must be 15 characters, starting with a 2-digit state code")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  contact_person: z.string().trim().max(150).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(150).optional().or(z.literal("")),
  bank_name: z.string().trim().max(150).optional().or(z.literal("")),
  bank_branch: z.string().trim().max(150).optional().or(z.literal("")),
  account_number: z.string().trim().max(30).optional().or(z.literal("")),
  ifsc_code: z.string().trim().toUpperCase().max(11).optional().or(z.literal("")),
  account_holder_name: z.string().trim().max(150).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "BLACKLISTED"]),
});

export type ContractorFormValues = z.infer<typeof contractorFormSchema>;
