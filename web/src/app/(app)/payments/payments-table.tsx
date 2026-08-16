"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { SendEmailDialog } from "@/components/send-email-dialog";
import { formatINR } from "@/lib/utils";
import { CancelPaymentDialog } from "./cancel-payment-dialog";
import { emailPaymentCertificate } from "./email-actions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SAVED: "secondary",
  APPROVED: "default",
  CANCELLED: "destructive",
};

export type PaymentRow = {
  id: string;
  invoice_number: string;
  contractor_name_snapshot: string;
  contractor_email: string | null;
  work_name: string;
  base_cost: number;
  net_payable_amount: number;
  status: "SAVED" | "APPROVED" | "CANCELLED";
  invoice_date: string;
};

export function PaymentsTable({
  payments,
  can_edit,
  can_delete,
  canViewCertificate,
}: {
  payments: PaymentRow[];
  can_edit: boolean;
  can_delete: boolean;
  canViewCertificate: boolean;
}) {
  const [query, setQuery] = useState("");
  const showActions = can_edit || can_delete || canViewCertificate;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => `${p.invoice_number} ${p.contractor_name_snapshot} ${p.work_name}`.toLowerCase().includes(q));
  }, [payments, query]);

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by invoice #, contractor, work..." />
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
                {showActions ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {payments.length === 0 ? "No payments recorded yet." : "No payments match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const canModify = p.status === "SAVED";
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.invoice_number}</TableCell>
                      <TableCell>{p.contractor_name_snapshot}</TableCell>
                      <TableCell>{p.work_name}</TableCell>
                      <TableCell className="text-right">{formatINR(p.base_cost)}</TableCell>
                      <TableCell className="text-right">{formatINR(p.net_payable_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                      </TableCell>
                      <TableCell>{p.invoice_date}</TableCell>
                      {showActions ? (
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
                          {canViewCertificate && p.status !== "CANCELLED" ? (
                            <SendEmailDialog
                              action={emailPaymentCertificate}
                              defaultEmail={p.contractor_email ?? ""}
                              extraFields={{ paymentId: p.id }}
                              triggerLabel="Email"
                              size="sm"
                            />
                          ) : null}
                          {can_edit && canModify ? (
                            <Link href={`/payments/${p.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                              Edit
                            </Link>
                          ) : null}
                          {can_delete && canModify ? (
                            <CancelPaymentDialog paymentId={p.id} invoiceNumber={p.invoice_number} />
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
