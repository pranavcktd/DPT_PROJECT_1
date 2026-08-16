"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { salaryPaymentFormSchema, type SalaryPaymentFormValues } from "./schema";

export type ActionState = { error: string | null; success?: boolean; paymentId?: string };

const CHECK_CONSTRAINT_MESSAGES: Record<string, string> = {
  chk_salpay_actual_after_token: "The actual payment date cannot be before the token generated date.",
};

function friendlyErrorFor(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  for (const [constraint, friendly] of Object.entries(CHECK_CONSTRAINT_MESSAGES)) {
    if (message.includes(`"${constraint}"`)) return friendly;
  }
  throw error;
}

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

function buildData(values: SalaryPaymentFormValues) {
  return {
    payment_type: values.payment_type,
    other_type_label: values.payment_type === "OTHER" ? toNullable(values.other_type_label) : null,
    gross_salary: values.gross_salary,
    it_deduction_amount: values.it_deduction_amount,
    pay_mode: values.pay_mode,
    treasury_token_number: values.pay_mode === "TREASURY" ? toNullable(values.treasury_token_number) : null,
    token_generated_date:
      values.pay_mode === "TREASURY" && values.token_generated_date ? new Date(values.token_generated_date) : null,
    // Omitted (not nulled) for Treasury mode so re-saving an already-reconciled
    // payment never wipes out the actual date entered via Treasury Reconciliation.
    ...(values.pay_mode === "OTHER_THAN_TREASURY"
      ? { actual_payment_date: values.actual_payment_date ? new Date(values.actual_payment_date) : null }
      : {}),
    remarks: toNullable(values.remarks),
  };
}

export async function createSalaryPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("SALARY_PAYMENT_ENTRY", "create");
  const parsed = salaryPaymentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const values = parsed.data;
  const departmentId = BigInt(user.departmentId);

  const employee = await db.employees.findFirst({ where: { id: BigInt(values.employee_id), department_id: departmentId } });
  if (!employee) return { error: "Employee not found." };

  try {
    const payment = await db.salary_payments.create({
      data: {
        department_id: departmentId,
        employee_id: employee.id,
        employee_name_snapshot: employee.employee_name,
        employee_pan_snapshot: employee.pan_number,
        ...buildData(values),
        status: "SAVED",
        created_by: BigInt(user.id),
      },
    });

    await writeAuditLog({
      departmentId,
      performedBy: BigInt(user.id),
      tableName: "salary_payments",
      recordId: payment.id,
      action: "CREATE",
      newData: payment,
    });

    revalidatePath("/salary-payments");
    return { error: null, success: true, paymentId: payment.id.toString() };
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }
}

export async function updateSalaryPayment(paymentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("SALARY_PAYMENT_ENTRY", "edit");
  const parsed = salaryPaymentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const values = parsed.data;
  const departmentId = BigInt(user.departmentId);
  const id = BigInt(paymentId);

  const existing = await db.salary_payments.findFirst({ where: { id, department_id: departmentId } });
  if (!existing) return { error: "Salary payment not found." };
  if (existing.status !== "SAVED") {
    return { error: `Cannot edit a payment with status ${existing.status}.` };
  }

  const employee = await db.employees.findFirst({ where: { id: BigInt(values.employee_id), department_id: departmentId } });
  if (!employee) return { error: "Employee not found." };

  try {
    const updated = await db.salary_payments.update({
      where: { id },
      data: {
        employee_id: employee.id,
        employee_name_snapshot: employee.employee_name,
        employee_pan_snapshot: employee.pan_number,
        ...buildData(values),
      },
    });

    await writeAuditLog({
      departmentId,
      performedBy: BigInt(user.id),
      tableName: "salary_payments",
      recordId: updated.id,
      action: "UPDATE",
      oldData: existing,
      newData: updated,
    });

    revalidatePath("/salary-payments");
    return { error: null, success: true, paymentId: updated.id.toString() };
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }
}

export async function cancelSalaryPayment(paymentId: string, reason: string): Promise<ActionState> {
  const user = await requireModulePermission("SALARY_PAYMENT_ENTRY", "delete");
  const departmentId = BigInt(user.departmentId);
  const id = BigInt(paymentId);

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: "A reason is required to cancel a payment." };
  }

  const existing = await db.salary_payments.findFirst({ where: { id, department_id: departmentId } });
  if (!existing) return { error: "Salary payment not found." };
  if (existing.status === "CANCELLED") return { error: "Payment is already cancelled." };

  const updated = await db.salary_payments.update({
    where: { id },
    data: { status: "CANCELLED", cancellation_reason: trimmedReason },
  });

  await writeAuditLog({
    departmentId,
    performedBy: BigInt(user.id),
    tableName: "salary_payments",
    recordId: updated.id,
    action: "DELETE",
    oldData: existing,
    newData: updated,
    reason: trimmedReason,
  });

  revalidatePath("/salary-payments");
  return { error: null, success: true };
}
