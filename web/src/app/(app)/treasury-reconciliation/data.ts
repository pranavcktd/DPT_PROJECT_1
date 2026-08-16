import "server-only";
import { db } from "@/lib/db";

export type ReconciliationRow = {
  id: string;
  recordType: "payment" | "salary_payment";
  reference: string;
  secondaryLabel: string;
  tokenNumber: string | null;
  tokenGeneratedDate: string | null;
  actualPaymentDate: string | null;
  amount: number;
  canEdit: boolean;
};

export async function getReconciliationRows(
  departmentId: bigint,
  options: {
    includePayments: boolean;
    includeSalaryPayments: boolean;
    canEditPayments: boolean;
    canEditSalaryPayments: boolean;
    statusFilter: "PENDING" | "RECONCILED" | "ALL";
  },
): Promise<ReconciliationRow[]> {
  const dateFilter =
    options.statusFilter === "PENDING"
      ? { actual_payment_date: null }
      : options.statusFilter === "RECONCILED"
        ? { actual_payment_date: { not: null } }
        : {};

  const [payments, salaryPayments] = await Promise.all([
    options.includePayments
      ? db.payments.findMany({
          where: { department_id: departmentId, pay_mode: "TREASURY", status: { not: "CANCELLED" }, ...dateFilter },
          orderBy: { token_generated_date: "asc" },
          select: {
            id: true,
            invoice_number: true,
            contractor_name_snapshot: true,
            treasury_token_number: true,
            token_generated_date: true,
            actual_payment_date: true,
            net_payable_amount: true,
          },
        })
      : [],
    options.includeSalaryPayments
      ? db.salary_payments.findMany({
          where: { department_id: departmentId, pay_mode: "TREASURY", status: { not: "CANCELLED" }, ...dateFilter },
          orderBy: { token_generated_date: "asc" },
          select: {
            id: true,
            employee_name_snapshot: true,
            payment_type: true,
            treasury_token_number: true,
            token_generated_date: true,
            actual_payment_date: true,
            net_payable_amount: true,
          },
        })
      : [],
  ]);

  const paymentRows: ReconciliationRow[] = payments.map((p) => ({
    id: p.id.toString(),
    recordType: "payment",
    reference: p.invoice_number,
    secondaryLabel: p.contractor_name_snapshot,
    tokenNumber: p.treasury_token_number,
    tokenGeneratedDate: p.token_generated_date?.toISOString().slice(0, 10) ?? null,
    actualPaymentDate: p.actual_payment_date?.toISOString().slice(0, 10) ?? null,
    amount: Number(p.net_payable_amount ?? 0),
    canEdit: options.canEditPayments,
  }));

  const salaryRows: ReconciliationRow[] = salaryPayments.map((p) => ({
    id: p.id.toString(),
    recordType: "salary_payment",
    reference: p.employee_name_snapshot,
    secondaryLabel: p.payment_type,
    tokenNumber: p.treasury_token_number,
    tokenGeneratedDate: p.token_generated_date?.toISOString().slice(0, 10) ?? null,
    actualPaymentDate: p.actual_payment_date?.toISOString().slice(0, 10) ?? null,
    amount: Number(p.net_payable_amount ?? 0),
    canEdit: options.canEditSalaryPayments,
  }));

  return [...paymentRows, ...salaryRows].sort((a, b) => (a.tokenGeneratedDate ?? "").localeCompare(b.tokenGeneratedDate ?? ""));
}
