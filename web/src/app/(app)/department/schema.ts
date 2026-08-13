import { z } from "zod";

export const departmentProfileSchema = z.object({
  department_name: z.string().trim().min(1, "Department name is required").max(150),
  office_address: z.string().trim().max(255).optional().or(z.literal("")),
  district: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z0-9]{13}$/, "GSTIN must be 15 characters, starting with a 2-digit state code")
    .optional()
    .or(z.literal("")),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN must be in the format AAAAA0000A")
    .optional()
    .or(z.literal("")),
  tan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}[0-9]{5}[A-Z]$/, "TAN must be in the format ABCD12345E")
    .optional()
    .or(z.literal("")),
  official_email: z.string().trim().email("Invalid email").max(150).optional().or(z.literal("")),
  contact_number: z.string().trim().max(20).optional().or(z.literal("")),
});

export type DepartmentProfileValues = z.infer<typeof departmentProfileSchema>;

export const ddoFormSchema = z.object({
  ddo_name: z.string().trim().min(1, "DDO name is required").max(150),
  designation: z.string().trim().min(1, "Designation is required").max(150),
  ddo_code: z.string().trim().max(50).optional().or(z.literal("")),
  treasury_registration_code: z.string().trim().max(50).optional().or(z.literal("")),
});

export type DdoFormValues = z.infer<typeof ddoFormSchema>;
