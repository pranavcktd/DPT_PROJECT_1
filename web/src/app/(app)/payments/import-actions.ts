"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { calculatePayment, deriveGstTdsType } from "@/lib/payment-calc";
import { parseCsvRows, summarizeImport, type ImportRowResult, type ImportSummary } from "@/lib/csv-import";

export type ImportActionState = { error: string | null; summary?: ImportSummary };

const deductionType = z.enum(["PERCENTAGE", "FIXED_AMOUNT", "NOT_APPLICABLE"]).optional().or(z.literal(""));

const paymentImportRowSchema = z.object({
  work_name: z.string().trim().min(1, "Work name is required"),
  contractor_pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "contractor_pan must be a valid PAN matching an existing contractor"),
  agreement_number: z.string().trim().min(1, "Agreement number is required").max(50),
  agreement_date: z.string().min(1, "Agreement date is required"),
  invoice_number: z.string().trim().min(1, "Invoice number is required").max(50),
  invoice_date: z.string().min(1, "Invoice date is required"),
  base_cost: z.coerce.number().positive("Must be greater than 0"),
  gst_rate: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  it_tds_rate: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  gst_tds_rate: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  labour_cess_rate: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  royalty_type: deductionType,
  royalty_value: z.coerce.number().min(0).optional().or(z.literal("")),
  stamp_duty_type: deductionType,
  stamp_duty_value: z.coerce.number().min(0).optional().or(z.literal("")),
  other_deduction_type: deductionType,
  other_deduction_value: z.coerce.number().min(0).optional().or(z.literal("")),
  other_deduction_remarks: z.string().trim().max(255).optional().or(z.literal("")),
  treasury_token_number: z.string().trim().max(50).optional().or(z.literal("")),
  treasury_payment_date: z.string().optional().or(z.literal("")),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}
function toNullableDate(value?: string): Date | null {
  return value && value.length > 0 ? new Date(value) : null;
}
function num(value: number | "" | undefined): number {
  return value === undefined || value === "" ? 0 : value;
}

function friendlyRowError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("exceeds remaining work order budget")) {
    return "Base cost exceeds the remaining budget for this work order.";
  }
  return message || "Unknown error";
}

export async function importPayments(_prev: ImportActionState, formData: FormData): Promise<ImportActionState> {
  const user = await requireModulePermission("PAYMENT_ENTRY", "create");
  const departmentId = BigInt(user.departmentId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a CSV file to upload." };
  }

  let rows: Record<string, string>[];
  try {
    rows = parseCsvRows(await file.text());
  } catch {
    return { error: "Could not parse this file - make sure it's a valid CSV." };
  }
  if (rows.length === 0) return { error: "The file has no data rows." };

  const department = await db.departments.findUniqueOrThrow({ where: { id: departmentId } });
  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const parsed = paymentImportRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      results.push({ row: rowNumber, error: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    const values = parsed.data;

    const matchingWorks = await db.works.findMany({ where: { department_id: departmentId, work_name: values.work_name } });
    if (matchingWorks.length === 0) {
      results.push({ row: rowNumber, error: `No work order named "${values.work_name}".` });
      continue;
    }
    if (matchingWorks.length > 1) {
      results.push({ row: rowNumber, error: `Multiple work orders named "${values.work_name}" - cannot disambiguate.` });
      continue;
    }
    const work = matchingWorks[0];

    const contractor = await db.contractors.findFirst({ where: { department_id: departmentId, pan_number: values.contractor_pan } });
    if (!contractor) {
      results.push({ row: rowNumber, error: `No contractor found with PAN ${values.contractor_pan}.` });
      continue;
    }

    const gstTdsType = deriveGstTdsType(department.state_code, contractor.gst_state_code);
    const royaltyType = values.royalty_type || "NOT_APPLICABLE";
    const stampDutyType = values.stamp_duty_type || "NOT_APPLICABLE";
    const otherDeductionType = values.other_deduction_type || "NOT_APPLICABLE";

    const calc = calculatePayment({
      baseCost: values.base_cost,
      gstRate: num(values.gst_rate),
      itTdsRate: num(values.it_tds_rate),
      gstTdsRate: num(values.gst_tds_rate),
      gstTdsType,
      labourCessRate: num(values.labour_cess_rate),
      royaltyType,
      royaltyValue: num(values.royalty_value),
      stampDutyType,
      stampDutyValue: num(values.stamp_duty_value),
      otherDeductionType,
      otherDeductionValue: num(values.other_deduction_value),
    });

    try {
      const payment = await db.payments.create({
        data: {
          department_id: departmentId,
          work_id: work.id,
          contractor_id: contractor.id,
          contractor_name_snapshot: contractor.firm_name,
          contractor_gstin_snapshot: contractor.gstin,
          contractor_pan_snapshot: contractor.pan_number,
          work_name_snapshot: work.work_name,
          agreement_number_snapshot: values.agreement_number,
          agreement_date_snapshot: new Date(values.agreement_date),
          invoice_number: values.invoice_number,
          invoice_date: new Date(values.invoice_date),
          base_cost: values.base_cost,
          gst_rate: num(values.gst_rate),
          gst_rate_is_manual: true,
          total_bill_value: calc.totalBillValue,
          it_tds_rate: num(values.it_tds_rate),
          it_tds_rate_is_manual: true,
          gst_tds_rate: num(values.gst_tds_rate),
          gst_tds_rate_is_manual: true,
          gst_tds_type: gstTdsType,
          labour_cess_rate: num(values.labour_cess_rate),
          labour_cess_rate_is_manual: true,
          royalty_type: royaltyType,
          royalty_value: num(values.royalty_value),
          stamp_duty_type: stampDutyType,
          stamp_duty_value: num(values.stamp_duty_value),
          other_deduction_type: otherDeductionType,
          other_deduction_value: num(values.other_deduction_value),
          other_deduction_remarks: toNullable(values.other_deduction_remarks),
          total_deductions: calc.totalDeductions,
          net_payable_amount: calc.netPayableAmount,
          treasury_token_number: toNullable(values.treasury_token_number),
          treasury_payment_date: toNullableDate(values.treasury_payment_date),
          remarks: toNullable(values.remarks),
          status: "SAVED",
          created_by: BigInt(user.id),
        },
      });
      await writeAuditLog({
        departmentId,
        performedBy: BigInt(user.id),
        tableName: "payments",
        recordId: payment.id,
        action: "CREATE",
        newData: payment,
        reason: "Bulk imported from CSV",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRowError(error) });
    }
  }

  revalidatePath("/payments");
  revalidatePath("/works");
  return { error: null, summary: summarizeImport(results) };
}
