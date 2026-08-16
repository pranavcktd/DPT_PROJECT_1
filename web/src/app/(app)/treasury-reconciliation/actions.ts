"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export type ActionState = { error: string | null; success?: boolean };

export async function setPaymentActualDate(paymentId: string, date: string): Promise<ActionState> {
  const user = await requireModulePermission("PAYMENT_ENTRY", "edit");
  const departmentId = BigInt(user.departmentId);
  const id = BigInt(paymentId);

  if (!date) return { error: "A date is required." };

  const existing = await db.payments.findFirst({ where: { id, department_id: departmentId } });
  if (!existing) return { error: "Payment not found." };
  if (existing.pay_mode !== "TREASURY") return { error: "This payment is not in Treasury pay mode." };

  const tokenDate = existing.token_generated_date?.toISOString().slice(0, 10);
  if (tokenDate && date < tokenDate) {
    return { error: "The actual payment date cannot be before the token generated date." };
  }

  const updated = await db.payments.update({
    where: { id },
    data: { actual_payment_date: new Date(date) },
  });

  await writeAuditLog({
    departmentId,
    performedBy: BigInt(user.id),
    tableName: "payments",
    recordId: id,
    action: "UPDATE",
    oldData: { actual_payment_date: existing.actual_payment_date },
    newData: { actual_payment_date: updated.actual_payment_date },
    reason: "Treasury reconciliation - actual payment date entered",
  });

  revalidatePath("/treasury-reconciliation");
  revalidatePath("/payments");
  return { error: null, success: true };
}

export async function setSalaryPaymentActualDate(paymentId: string, date: string): Promise<ActionState> {
  const user = await requireModulePermission("SALARY_PAYMENT_ENTRY", "edit");
  const departmentId = BigInt(user.departmentId);
  const id = BigInt(paymentId);

  if (!date) return { error: "A date is required." };

  const existing = await db.salary_payments.findFirst({ where: { id, department_id: departmentId } });
  if (!existing) return { error: "Salary payment not found." };
  if (existing.pay_mode !== "TREASURY") return { error: "This payment is not in Treasury pay mode." };

  const tokenDate = existing.token_generated_date?.toISOString().slice(0, 10);
  if (tokenDate && date < tokenDate) {
    return { error: "The actual payment date cannot be before the token generated date." };
  }

  const updated = await db.salary_payments.update({
    where: { id },
    data: { actual_payment_date: new Date(date) },
  });

  await writeAuditLog({
    departmentId,
    performedBy: BigInt(user.id),
    tableName: "salary_payments",
    recordId: id,
    action: "UPDATE",
    oldData: { actual_payment_date: existing.actual_payment_date },
    newData: { actual_payment_date: updated.actual_payment_date },
    reason: "Treasury reconciliation - actual payment date entered",
  });

  revalidatePath("/treasury-reconciliation");
  revalidatePath("/salary-payments");
  return { error: null, success: true };
}
