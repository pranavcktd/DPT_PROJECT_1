import { z } from "zod";

export const PAYMENT_TYPES = ["SALARY", "DA", "ARREAR", "MEDICAL_REIMBURSEMENT", "OTHER"] as const;
export const PAY_MODES = ["TREASURY", "OTHER_THAN_TREASURY"] as const;

export const salaryPaymentFormSchema = z
  .object({
    employee_id: z.string().min(1, "Employee is required"),
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
