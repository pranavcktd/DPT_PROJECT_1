import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { PaymentsTable } from "./payments-table";

export default async function PaymentsPage() {
  const { user, can_create, can_edit, can_delete } = await getModulePermissions("PAYMENT_ENTRY");
  const { can_view: canViewCertificate } = await getModulePermissions("PAYMENT_CERTIFICATE");
  const departmentId = BigInt(user.departmentId);
  const theme = MODULE_THEME.payments;

  const payments = await db.payments.findMany({
    where: { department_id: departmentId },
    include: { works: { select: { work_name: true } } },
    orderBy: { created_at: "desc" },
  });

  const rows = payments.map((p) => ({
    id: p.id.toString(),
    invoice_number: p.invoice_number,
    contractor_name_snapshot: p.contractor_name_snapshot,
    work_name: p.works.work_name,
    base_cost: Number(p.base_cost),
    net_payable_amount: Number(p.net_payable_amount ?? 0),
    status: p.status,
    invoice_date: p.invoice_date.toISOString().slice(0, 10),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="payments"
        title="Non-Salary Payments"
        description="Running Account bills, statutory deductions, and treasury references for contractors."
        action={
          can_create ? (
            <Link href="/payments/new" className={cn(buttonVariants({ variant: "default" }), theme.button)}>
              New Payment
            </Link>
          ) : null
        }
      />
      <PaymentsTable payments={rows} can_edit={can_edit} can_delete={can_delete} canViewCertificate={canViewCertificate} />
    </div>
  );
}
