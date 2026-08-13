import { z } from "zod";

const boolFromString = z.preprocess((v) => v === "true" || v === true, z.boolean());
const deductionType = z.enum(["PERCENTAGE", "FIXED_AMOUNT", "NOT_APPLICABLE"]);
const gstTdsTypeEnum = z.enum(["INTRA_STATE", "INTER_STATE", "NOT_APPLICABLE"]);

export const paymentFormSchema = z.object({
  work_id: z.string().min(1, "Work order is required"),
  contractor_id: z.string().min(1, "Contractor is required"),
  agreement_number: z.string().trim().min(1, "Agreement number is required").max(50),
  agreement_date: z.string().min(1, "Agreement date is required"),

  invoice_number: z.string().trim().min(1, "Invoice number is required").max(50),
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

  treasury_token_number: z.string().trim().max(50).optional().or(z.literal("")),
  treasury_payment_date: z.string().optional().or(z.literal("")),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});

export type PaymentFormValues = z.output<typeof paymentFormSchema>;
export type PaymentFormInput = z.input<typeof paymentFormSchema>;
