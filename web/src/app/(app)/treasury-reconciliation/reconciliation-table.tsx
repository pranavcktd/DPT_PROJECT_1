"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEnumLabel, formatINR } from "@/lib/utils";
import type { ReconciliationRow } from "./data";
import { setPaymentActualDate, setSalaryPaymentActualDate } from "./actions";

function ReconciliationRowActions({ row }: { row: ReconciliationRow }) {
  const router = useRouter();
  const [date, setDate] = useState(row.actualPaymentDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [appliedNote, setAppliedNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setAppliedNote(null);
    startTransition(async () => {
      const action = row.recordType === "payment" ? setPaymentActualDate : setSalaryPaymentActualDate;
      const result = await action(row.id, date);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.updatedCount && result.updatedCount > 1) {
        setAppliedNote(`Applied to ${result.updatedCount} payments sharing token "${row.tokenNumber}".`);
      }
      router.refresh();
    });
  }

  if (!row.canEdit) {
    return <span className="text-xs text-muted-foreground">No edit access</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          min={row.tokenGeneratedDate ?? undefined}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 w-36"
        />
        <Button size="sm" onClick={handleSave} disabled={isPending || !date || date === row.actualPaymentDate}>
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {appliedNote ? <p className="text-xs text-emerald-600">{appliedNote}</p> : null}
    </div>
  );
}

export function ReconciliationTable({ rows }: { rows: ReconciliationRow[] }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Contractor / Employee</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Token Number</TableHead>
              <TableHead>Token Generated Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actual Payment Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No treasury payments match this filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={`${row.recordType}-${row.id}`}>
                  <TableCell className="whitespace-nowrap">
                    {row.recordType === "payment" ? "Non-Salary" : "Salary"}
                  </TableCell>
                  <TableCell className="font-medium">{row.reference}</TableCell>
                  <TableCell>
                    {row.recordType === "salary_payment" ? formatEnumLabel(row.secondaryLabel) : row.secondaryLabel}
                  </TableCell>
                  <TableCell className="text-right">{formatINR(row.amount)}</TableCell>
                  <TableCell>{row.tokenNumber ?? "-"}</TableCell>
                  <TableCell>{row.tokenGeneratedDate ?? "-"}</TableCell>
                  <TableCell>
                    {row.actualPaymentDate ? (
                      <Badge>Reconciled</Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300 text-amber-700">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <ReconciliationRowActions row={row} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
