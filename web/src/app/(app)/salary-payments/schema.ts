import { z } from "zod";

export const PAYMENT_TYPES = [
  "SALARY",
  "DA",
  "ARREAR",
  "MEDICAL_REIMBURSEMENT",
  "SALARY_ARREAR",
  "DA_ARREAR",
  "OTHER",
] as const;

// formatEnumLabel()'s generic snake_case -> Title Case doesn't capitalize "DA"
// correctly ("Da" instead of "DA"), so payment types get their own labels.
export const PAYMENT_TYPE_LABELS: Record<(typeof PAYMENT_TYPES)[number], string> = {
  SALARY: "Salary",
  DA: "DA",
  ARREAR: "Arrear",
  MEDICAL_REIMBURSEMENT: "Medical Reimbursement",
  SALARY_ARREAR: "Salary Arrear",
  DA_ARREAR: "DA Arrear",
  OTHER: "Other",
};

export const PAY_MODES = ["TREASURY", "OTHER_THAN_TREASURY"] as const;

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

/** The month/year one calendar month before `date` - the sensible default
 * for "which month's salary is this" when entering payments (payroll for a
 * month is normally processed the following month). */
export function previousMonth(date: Date): { month: number; year: number } {
  const month = date.getUTCMonth(); // 0-11
  const year = date.getUTCFullYear();
  return month === 0 ? { month: 12, year: year - 1 } : { month, year };
}

export const salaryPaymentFormSchema = z
  .object({
    employee_id: z.string().min(1, "Employee is required"),
    payment_period_month: z.coerce.number().int().min(1).max(12),
    payment_period_year: z.coerce.number().int().min(2000).max(2100),
    payment_type: z.enum(PAYMENT_TYPES),
    other_type_label: z.string().trim().max(100).optional().or(z.literal("")),
    gross_salary: z.coerce.number().positive("Must be greater than 0"),
    it_deduction_amount: z.coerce.number().min(0),
    pay_mode: z.enum(PAY_MODES),
    treasury_token_number: z.string().trim().max(50).optional().or(z.literal("")),
    token_generated_date: z.string().optional().or(z.literal("")),
    actual_payment_date: z.string().optional().or(z.literal("")),
    remarks: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.payment_type !== "OTHER" || (data.other_type_label && data.other_type_label.trim().length > 0), {
    message: "Please name this payment type",
    path: ["other_type_label"],
  })
  .superRefine((data, ctx) => {
    if (data.pay_mode === "TREASURY") {
      if (!data.treasury_token_number?.trim()) {
        ctx.addIssue({ code: "custom", message: "Treasury token number is required", path: ["treasury_token_number"] });
      }
      if (!data.token_generated_date) {
        ctx.addIssue({ code: "custom", message: "Token generated date is required", path: ["token_generated_date"] });
      }
    } else if (!data.actual_payment_date) {
      ctx.addIssue({ code: "custom", message: "Payment date is required", path: ["actual_payment_date"] });
    }
  });

export type SalaryPaymentFormInput = z.input<typeof salaryPaymentFormSchema>;
export type SalaryPaymentFormValues = z.output<typeof salaryPaymentFormSchema>;
