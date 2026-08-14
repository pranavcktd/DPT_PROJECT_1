"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { calculatePayment, deriveGstTdsType } from "@/lib/payment-calc";
import { paymentFormSchema, type PaymentFormValues } from "./schema";

export type ActionState = { error: string | null; success?: boolean; paymentId?: string };

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

/**
 * The budget-guardrail trigger in database/schema.sql raises
 * `SIGNAL SQLSTATE '45000'` with a plain-English message on violation.
 * Verified empirically (see the Works module) that Prisma surfaces this as
 * PrismaClientKnownRequestError with the original trigger message preserved
 * inline in error.message - match on known phrasing, rethrow anything else.
 */
function friendlyErrorFor(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("exceeds remaining work order budget")) {
    return "Base cost exceeds the remaining budget for this work order.";
  }
  throw error;
}

/**
 * Postgres forbids a generated column from referencing another generated
 * column, so `total_bill_value`, `total_deductions`, and `net_payable_amount`
 * are plain columns (see database/schema.sql header note) - the app must
 * compute and supply them on every write via calculatePayment(), which
 * mirrors the DB's own per-line generated-column formulas exactly.
 */
function buildDeductionFields(values: PaymentFormValues, gstTdsType: ReturnType<typeof deriveGstTdsType>) {
  const calc = calculatePayment({
    baseCost: values.base_cost,
    gstRate: values.gst_rate,
    itTdsRate: values.it_tds_rate,
    gstTdsRate: values.gst_tds_rate,
    gstTdsType,
    labourCessRate: values.labour_cess_rate,
    royaltyType: values.royalty_type,
    royaltyValue: values.royalty_value,
    stampDutyType: values.stamp_duty_type,
    stampDutyValue: values.stamp_duty_value,
    otherDeductionType: values.other_deduction_type,
    otherDeductionValue: values.other_deduction_value,
  });

  return {
    invoice_number: values.invoice_number,
    invoice_date: new Date(values.invoice_date),
    base_cost: values.base_cost,

    gst_rate: values.gst_rate,
    gst_rate_is_manual: values.gst_rate_is_manual,
    total_bill_value: calc.totalBillValue,

    it_tds_rate: values.it_tds_rate,
    it_tds_rate_is_manual: values.it_tds_rate_is_manual,

    gst_tds_rate: values.gst_tds_rate,
    gst_tds_rate_is_manual: values.gst_tds_rate_is_manual,
    gst_tds_type: gstTdsType,

    labour_cess_rate: values.labour_cess_rate,
    labour_cess_rate_is_manual: values.labour_cess_rate_is_manual,

    royalty_type: values.royalty_type,
    royalty_value: values.royalty_value,

    stamp_duty_type: values.stamp_duty_type,
    stamp_duty_value: values.stamp_duty_value,

    other_deduction_type: values.other_deduction_type,
    other_deduction_value: values.other_deduction_value,
    other_deduction_remarks: toNullable(values.other_deduction_remarks),

    total_deductions: calc.totalDeductions,
    net_payable_amount: calc.netPayableAmount,

    treasury_token_number: toNullable(values.treasury_token_number),
    treasury_payment_date: values.treasury_payment_date ? new Date(values.treasury_payment_date) : null,
    remarks: toNullable(values.remarks),
  };
}

export async function createPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("PAYMENT_ENTRY", "create");
  const parsed = paymentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const values: PaymentFormValues = parsed.data;
  const departmentId = BigInt(user.departmentId);

  const [work, contractor, department] = await Promise.all([
    db.works.findFirst({ where: { id: BigInt(values.work_id), department_id: departmentId } }),
    db.contractors.findFirst({ where: { id: BigInt(values.contractor_id), department_id: departmentId } }),
    db.departments.findUniqueOrThrow({ where: { id: departmentId } }),
  ]);
  if (!work) return { error: "Work order not found." };
  if (!contractor) return { error: "Contractor not found." };

  // Never trust the client's GST-TDS type - re-derive from the department's
  // and contractor's state codes server-side.
  const gstTdsType = deriveGstTdsType(department.state_code, contractor.gst_state_code);

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
        ...buildDeductionFields(values, gstTdsType),
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
    });

    revalidatePath("/payments");
    revalidatePath("/works");
    return { error: null, success: true, paymentId: payment.id.toString() };
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }
}

export async function updatePayment(paymentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("PAYMENT_ENTRY", "edit");
  const parsed = paymentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const values: PaymentFormValues = parsed.data;
  const departmentId = BigInt(user.departmentId);
  const id = BigInt(paymentId);

  const existing = await db.payments.findFirst({ where: { id, department_id: departmentId } });
  if (!existing) return { error: "Payment not found." };
  if (existing.status !== "SAVED") {
    return { error: `Cannot edit a payment with status ${existing.status}.` };
  }

  const [work, contractor, department] = await Promise.all([
    db.works.findFirst({ where: { id: BigInt(values.work_id), department_id: departmentId } }),
    db.contractors.findFirst({ where: { id: BigInt(values.contractor_id), department_id: departmentId } }),
    db.departments.findUniqueOrThrow({ where: { id: departmentId } }),
  ]);
  if (!work) return { error: "Work order not found." };
  if (!contractor) return { error: "Contractor not found." };

  const gstTdsType = deriveGstTdsType(department.state_code, contractor.gst_state_code);

  try {
    const updated = await db.payments.update({
      where: { id },
      data: {
        work_id: work.id,
        contractor_id: contractor.id,
        contractor_name_snapshot: contractor.firm_name,
        contractor_gstin_snapshot: contractor.gstin,
        contractor_pan_snapshot: contractor.pan_number,
        work_name_snapshot: work.work_name,
        agreement_number_snapshot: values.agreement_number,
        agreement_date_snapshot: new Date(values.agreement_date),
        ...buildDeductionFields(values, gstTdsType),
      },
    });

    await writeAuditLog({
      departmentId,
      performedBy: BigInt(user.id),
      tableName: "payments",
      recordId: updated.id,
      action: "UPDATE",
      oldData: existing,
      newData: updated,
    });

    revalidatePath("/payments");
    revalidatePath("/works");
    return { error: null, success: true, paymentId: updated.id.toString() };
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }
}

export async function cancelPayment(paymentId: string, reason: string): Promise<ActionState> {
  const user = await requireModulePermission("PAYMENT_ENTRY", "delete");
  const departmentId = BigInt(user.departmentId);
  const id = BigInt(paymentId);

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: "A reason is required to cancel a payment." };
  }

  const existing = await db.payments.findFirst({ where: { id, department_id: departmentId } });
  if (!existing) return { error: "Payment not found." };
  if (existing.status === "CANCELLED") return { error: "Payment is already cancelled." };

  const updated = await db.payments.update({
    where: { id },
    data: { status: "CANCELLED", cancellation_reason: trimmedReason },
  });

  await writeAuditLog({
    departmentId,
    performedBy: BigInt(user.id),
    tableName: "payments",
    recordId: updated.id,
    action: "DELETE",
    oldData: existing,
    newData: updated,
    reason: trimmedReason,
  });

  revalidatePath("/payments");
  revalidatePath("/works");
  return { error: null, success: true };
}
