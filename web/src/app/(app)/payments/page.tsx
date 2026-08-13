import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { CancelPaymentDialog } from "./cancel-payment-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SAVED: "secondary",
  APPROVED: "default",
  CANCELLED: "destructive",
};

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

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

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="payments"
        title="Payment Register"
        description="Running Account bills, statutory deductions, and treasury references."
        action={
          can_create ? (
            <Link href="/payments/new" className={cn(buttonVariants({ variant: "default" }), theme.button)}>
              New Payment
            </Link>
          ) : null
        }
      />
      <Card>
        <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead>Work</TableHead>
              <TableHead className="text-right">Base Cost</TableHead>
              <TableHead className="text-right">Net Payable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice Date</TableHead>
              {can_edit || can_delete || canViewCertificate ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No payments recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => {
                const canModify = p.status === "SAVED";
                return (
                  <TableRow key={p.id.toString()}>
                    <TableCell className="font-medium">{p.invoice_number}</TableCell>
                    <TableCell>{p.contractor_name_snapshot}</TableCell>
                    <TableCell>{p.works.work_name}</TableCell>
                    <TableCell className="text-right">{formatINR(Number(p.base_cost))}</TableCell>
                    <TableCell className="text-right">{formatINR(Number(p.net_payable_amount ?? 0))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>{p.invoice_date.toISOString().slice(0, 10)}</TableCell>
                    {can_edit || can_delete || canViewCertificate ? (
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        {canViewCertificate && p.status !== "CANCELLED" ? (
                          <a
                            href={`/api/payments/${p.id}/certificate`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "secondary", size: "sm" })}
                          >
                            Certificate
                          </a>
                        ) : null}
                        {can_edit && canModify ? (
                          <Link href={`/payments/${p.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                            Edit
                          </Link>
                        ) : null}
                        {can_delete && canModify ? (
                          <CancelPaymentDialog paymentId={p.id.toString()} invoiceNumber={p.invoice_number} />
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </div>
  );
}
