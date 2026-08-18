"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export type ActionState = { error: string | null; success?: boolean; updatedCount?: number };

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

  // A treasury token often bundles multiple bills under one challan - enter
  // the reconciled date once and it auto-applies to every payment sharing
  // that same token number, so it doesn't need to be re-entered per bill.
  const siblings = existing.treasury_token_number
    ? await db.payments.findMany({
        where: { department_id: departmentId, pay_mode: "TREASURY", treasury_token_number: existing.treasury_token_number },
      })
    : [existing];

  const latestInvoiceDate = siblings.reduce<string | null>((max, s) => {
    const d = s.invoice_date.toISOString().slice(0, 10);
    return !max || d > max ? d : max;
  }, null);
  if (latestInvoiceDate && date < latestInvoiceDate) {
    return {
      error: `Another bill on this same token has an invoice date of ${latestInvoiceDate} - the actual payment date can't be before it.`,
    };
  }

  const newDate = new Date(date);
  await db.payments.updateMany({
    where: { id: { in: siblings.map((s) => s.id) } },
    data: { actual_payment_date: newDate },
  });

  await Promise.all(
    siblings.map((s) =>
      writeAuditLog({
        departmentId,
        performedBy: BigInt(user.id),
        tableName: "payments",
        recordId: s.id,
        action: "UPDATE",
        oldData: { actual_payment_date: s.actual_payment_date },
        newData: { actual_payment_date: newDate },
        reason:
          s.id === id
            ? "Treasury reconciliation - actual payment date entered"
            : `Treasury reconciliation - auto-applied from token "${existing.treasury_token_number}" (same token as payment #${id})`,
      }),
    ),
  );

  revalidatePath("/treasury-reconciliation");
  revalidatePath("/payments");
  return { error: null, success: true, updatedCount: siblings.length };
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

  const siblings = existing.treasury_token_number
    ? await db.salary_payments.findMany({
        where: { department_id: departmentId, pay_mode: "TREASURY", treasury_token_number: existing.treasury_token_number },
      })
    : [existing];

  const newDate = new Date(date);
  await db.salary_payments.updateMany({
    where: { id: { in: siblings.map((s) => s.id) } },
    data: { actual_payment_date: newDate },
  });

  await Promise.all(
    siblings.map((s) =>
      writeAuditLog({
        departmentId,
        performedBy: BigInt(user.id),
        tableName: "salary_payments",
        recordId: s.id,
        action: "UPDATE",
        oldData: { actual_payment_date: s.actual_payment_date },
        newData: { actual_payment_date: newDate },
        reason:
          s.id === id
            ? "Treasury reconciliation - actual payment date entered"
            : `Treasury reconciliation - auto-applied from token "${existing.treasury_token_number}" (same token as payment #${id})`,
      }),
    ),
  );

  revalidatePath("/treasury-reconciliation");
  revalidatePath("/salary-payments");
  return { error: null, success: true, updatedCount: siblings.length };
}
