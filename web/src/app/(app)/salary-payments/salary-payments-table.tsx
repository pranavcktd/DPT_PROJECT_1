"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { formatEnumLabel, formatINR } from "@/lib/utils";
import { SalaryPaymentFormDialog } from "./salary-payment-form-dialog";
import { CancelSalaryPaymentDialog } from "./cancel-salary-payment-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SAVED: "secondary",
  APPROVED: "default",
  CANCELLED: "destructive",
};

export type SalaryPaymentRow = {
  id: string;
  employee_id: string;
  employee_name_snapshot: string;
  payment_type: "SALARY" | "DA" | "ARREAR" | "MEDICAL_REIMBURSEMENT" | "OTHER";
  other_type_label: string;
  gross_salary: number;
  it_deduction_amount: number;
  net_payable_amount: number;
  treasury_token_number: string;
  treasury_payment_date: string;
  remarks: string;
  status: "SAVED" | "APPROVED" | "CANCELLED";
};

type EmployeeOption = { id: string; employee_name: string; pan_number: string };

export function SalaryPaymentsTable({
  payments,
  employees,
  can_edit,
  can_delete,
}: {
  payments: SalaryPaymentRow[];
  employees: EmployeeOption[];
  can_edit: boolean;
  can_delete: boolean;
}) {
  const [query, setQuery] = useState("");
  const showActions = can_edit || can_delete;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      `${p.employee_name_snapshot} ${p.payment_type} ${p.other_type_label} ${p.treasury_token_number}`
        .toLowerCase()
        .includes(q),
    );
  }, [payments, query]);

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by employee name, payment type..." />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead className="text-right">Gross Salary</TableHead>
                <TableHead className="text-right">IT Deduction</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                {showActions ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {payments.length === 0 ? "No salary payments recorded yet." : "No payments match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const canModify = p.status === "SAVED";
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.employee_name_snapshot}</TableCell>
                      <TableCell>{p.payment_type === "OTHER" ? p.other_type_label : formatEnumLabel(p.payment_type)}</TableCell>
                      <TableCell className="text-right">{formatINR(p.gross_salary)}</TableCell>
                      <TableCell className="text-right">{formatINR(p.it_deduction_amount)}</TableCell>
                      <TableCell className="text-right">{formatINR(p.net_payable_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                      </TableCell>
                      <TableCell>{p.treasury_payment_date || "-"}</TableCell>
                      {showActions ? (
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          {can_edit && canModify ? (
                            <SalaryPaymentFormDialog
                              employees={employees}
                              payment={{
                                id: p.id,
                                employee_id: p.employee_id,
                                payment_type: p.payment_type,
                                other_type_label: p.other_type_label,
                                gross_salary: p.gross_salary,
                                it_deduction_amount: p.it_deduction_amount,
                                treasury_token_number: p.treasury_token_number,
                                treasury_payment_date: p.treasury_payment_date,
                                remarks: p.remarks,
                              }}
                              triggerLabel="Edit"
                              triggerVariant="outline"
                              triggerSize="sm"
                            />
                          ) : null}
                          {can_delete && canModify ? (
                            <CancelSalaryPaymentDialog paymentId={p.id} employeeName={p.employee_name_snapshot} />
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
