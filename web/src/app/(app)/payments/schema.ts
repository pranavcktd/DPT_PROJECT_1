import { z } from "zod";

const boolFromString = z.preprocess((v) => v === "true" || v === true, z.boolean());
const deductionType = z.enum(["PERCENTAGE", "FIXED_AMOUNT", "NOT_APPLICABLE"]);
const gstTdsTypeEnum = z.enum(["INTRA_STATE", "INTER_STATE", "NOT_APPLICABLE"]);

export const PAY_MODES = ["TREASURY", "OTHER_THAN_TREASURY"] as const;

export const paymentFormSchemaBase = z.object({
  work_id: z.string().min(1, "Work order is required"),
  contractor_id: z.string().min(1, "Contractor is required"),
  agreement_number: z.string().trim().min(1, "Agreement number is required").max(50),
  agreement_date: z.string().min(1, "Agreement date is required"),

  invoice_number: z
    .string()
    .trim()
    .min(1, "Invoice number is required")
    .max(16, "Invoice number cannot exceed 16 characters")
    .regex(/^[A-Za-z0-9\-/]+$/, "Only letters, numbers, hyphen (-) and slash (/) are allowed"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  base_cost: z.coerce.number().positive("Must be greater than 0"),

  gst_rate: z.coerce.number().min(0).max(100),
  gst_rate_is_manual: boolFromString,

  it_tds_rate: z.coerce.number().min(0).max(100),
  it_tds_rate_is_manual: boolFromString,

  gst_tds_rate: z.coerce.number().min(0).max(100),
  gst_tds_rate_is_manual: boolFromString,
  gst_tds_type: gstTdsTypeEnum,

  labour_cess_rate: z.coerce.number().min(0).max(100),
  labour_cess_rate_is_manual: boolFromString,

  royalty_type: deductionType,
  royalty_value: z.coerce.number().min(0),

  stamp_duty_type: deductionType,
  stamp_duty_value: z.coerce.number().min(0),

  other_deduction_type: deductionType,
  other_deduction_value: z.coerce.number().min(0),
  other_deduction_remarks: z.string().trim().max(255).optional().or(z.literal("")),

  pay_mode: z.enum(PAY_MODES),
  treasury_token_number: z.string().trim().max(50).optional().or(z.literal("")),
  token_generated_date: z.string().optional().or(z.literal("")),
  actual_payment_date: z.string().optional().or(z.literal("")),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});

/**
 * Treasury mode needs a token + the date it was generated (the real payment
 * date comes later via Treasury Reconciliation, once the treasury's
 * statement confirms it). Other-Than-Treasury has no token/reconciliation
 * step - the payment date is simply entered directly, known at entry time.
 *
 * Also enforces the date hierarchy the system must never allow to be
 * entered out of order: agreement -> invoice -> token generated -> actual
 * payment. This mirrors the DB CHECK constraints (chk_payment_*) added as a
 * backstop - validating here first gives a field-level error instead of a
 * raw database error.
 */
export const paymentFormSchema = paymentFormSchemaBase.superRefine((data, ctx) => {
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

  if (data.agreement_date && data.invoice_date && data.invoice_date < data.agreement_date) {
    ctx.addIssue({ code: "custom", message: "Invoice date cannot be before the agreement date", path: ["invoice_date"] });
  }
  if (data.invoice_date && data.pay_mode === "TREASURY" && data.token_generated_date) {
    if (data.token_generated_date < data.invoice_date) {
      ctx.addIssue({
        code: "custom",
        message: "Token generated date cannot be before the invoice date",
        path: ["token_generated_date"],
      });
    }
  }
  if (data.invoice_date && data.pay_mode === "OTHER_THAN_TREASURY" && data.actual_payment_date) {
    if (data.actual_payment_date < data.invoice_date) {
      ctx.addIssue({ code: "custom", message: "Payment date cannot be before the invoice date", path: ["actual_payment_date"] });
    }
  }
});

export type PaymentFormValues = z.output<typeof paymentFormSchema>;
export type PaymentFormInput = z.input<typeof paymentFormSchema>;
