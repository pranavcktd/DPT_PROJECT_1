import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { SalaryPaymentFormDialog } from "./salary-payment-form-dialog";
import { SalaryPaymentsImportDialog } from "./import-dialog";
import { SalaryPaymentsTable } from "./salary-payments-table";

export default async function SalaryPaymentsPage() {
  const { user, can_create, can_edit, can_delete } = await getModulePermissions("SALARY_PAYMENT_ENTRY");
  const departmentId = BigInt(user.departmentId);
  const theme = MODULE_THEME.salaryPayments;

  const [payments, employees] = await Promise.all([
    db.salary_payments.findMany({ where: { department_id: departmentId }, orderBy: { created_at: "desc" } }),
    db.employees.findMany({
      where: { department_id: departmentId, status: "ACTIVE" },
      orderBy: { employee_name: "asc" },
      select: { id: true, employee_name: true, pan_number: true },
    }),
  ]);

  const employeeOptions = employees.map((e) => ({ id: e.id.toString(), employee_name: e.employee_name, pan_number: e.pan_number }));

  const rows = payments.map((p) => ({
    id: p.id.toString(),
    employee_id: p.employee_id.toString(),
    employee_name_snapshot: p.employee_name_snapshot,
    payment_type: p.payment_type,
    other_type_label: p.other_type_label ?? "",
    gross_salary: Number(p.gross_salary),
    it_deduction_amount: Number(p.it_deduction_amount),
    net_payable_amount: Number(p.net_payable_amount ?? 0),
    pay_mode: p.pay_mode,
    treasury_token_number: p.treasury_token_number ?? "",
    token_generated_date: p.token_generated_date?.toISOString().slice(0, 10) ?? "",
    actual_payment_date: p.actual_payment_date?.toISOString().slice(0, 10) ?? "",
    treasury_payment_date: p.treasury_payment_date?.toISOString().slice(0, 10) ?? "",
    payment_date_is_estimated: !!p.payment_date_is_estimated,
    remarks: p.remarks ?? "",
    status: p.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="salaryPayments"
        title="Salary Payments"
        description="Salary, DA, arrears, and other employee payment entries."
        action={
          can_create ? (
            <div className="flex flex-wrap items-center gap-2">
              <a href="/api/salary-payments/export" className={buttonVariants({ variant: "outline" })}>
                Export
              </a>
              <SalaryPaymentsImportDialog />
              <SalaryPaymentFormDialog employees={employeeOptions} triggerLabel="New Salary Payment" triggerClassName={theme.button} />
            </div>
          ) : null
        }
      />
      <SalaryPaymentsTable payments={rows} employees={employeeOptions} can_edit={can_edit} can_delete={can_delete} />
    </div>
  );
}
