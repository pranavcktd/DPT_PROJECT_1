import { z } from "zod";

export const employeeFormSchema = z.object({
  employee_name: z.string().trim().min(1, "Employee name is required").max(150),
  pan_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN must be in the format AAAAA0000A"),
  email: z.string().trim().email("Invalid email").max(150).optional().or(z.literal("")),
  designation: z.string().trim().max(100).optional().or(z.literal("")),
  employee_code: z.string().trim().max(30).optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  mobile: z.string().trim().max(20).optional().or(z.literal("")),
  joining_date: z.string().optional().or(z.literal("")),
  transfer_date: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
