import { z } from "zod";

export const onboardDepartmentSchema = z.object({
  department_name: z.string().trim().min(1, "Department name is required").max(150),
  tenant_code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Tenant code is required")
    .max(20)
    .regex(/^[A-Z0-9-]+$/, "Use only letters, numbers, and hyphens"),
  official_email: z.string().trim().toLowerCase().email("A valid official email is required").max(150),
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
  contact_number: z.string().trim().max(20).optional().or(z.literal("")),
  subscription_amount: z.coerce.number().min(0).optional().or(z.literal("")),
  subscription_start_date: z.string().trim().optional().or(z.literal("")),
  subscription_days: z.coerce.number().int().positive().optional().or(z.literal("")),
});

export type OnboardDepartmentInput = z.input<typeof onboardDepartmentSchema>;
export type OnboardDepartmentValues = z.output<typeof onboardDepartmentSchema>;

export const subscriptionSchema = z.object({
  subscription_amount: z.coerce.number().min(0).optional().or(z.literal("")),
  subscription_start_date: z.string().trim().optional().or(z.literal("")),
  subscription_days: z.coerce.number().int().positive().optional().or(z.literal("")),
});

export type SubscriptionInput = z.input<typeof subscriptionSchema>;
export type SubscriptionValues = z.output<typeof subscriptionSchema>;
