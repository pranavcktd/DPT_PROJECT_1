import { z } from "zod";

export const PAYMENT_TYPES = ["SALARY", "DA", "ARREAR", "MEDICAL_REIMBURSEMENT", "OTHER"] as const;

export const salaryPaymentFormSchema = z
  .object({
    employee_id: z.string().min(1, "Employee is required"),
    payment_type: z.enum(PAYMENT_TYPES),
    other_type_label: z.string().trim().max(100).optional().or(z.literal("")),
    gross_salary: z.coerce.number().positive("Must be greater than 0"),
    it_deduction_amount: z.coerce.number().min(0),
    treasury_token_number: z.string().trim().max(50).optional().or(z.literal("")),
    treasury_payment_date: z.string().optional().or(z.literal("")),
    remarks: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.payment_type !== "OTHER" || (data.other_type_label && data.other_type_label.trim().length > 0), {
    message: "Please name this payment type",
    path: ["other_type_label"],
  });

export type SalaryPaymentFormInput = z.input<typeof salaryPaymentFormSchema>;
export type SalaryPaymentFormValues = z.output<typeof salaryPaymentFormSchema>;
