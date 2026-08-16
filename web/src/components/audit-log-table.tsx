"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export type AuditLogRow = {
  id: string;
  created_at: string;
  user_name: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string;
  reason: string | null;
  ip_address: string | null;
  old_data: unknown;
  new_data: unknown;
  department_name?: string;
};

const ACTION_VARIANT: Record<AuditLogRow["action"], "default" | "secondary" | "destructive"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

function AuditLogDetailsDialog({ row }: { row: AuditLogRow }) {
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })} render={<button type="button" />}>
        Details
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {row.action} on {row.table_name} #{row.record_id}
          </DialogTitle>
          <DialogDescription>
            {formatDateTime(row.created_at)} by {row.user_name ?? "Unknown user"}
            {row.department_name ? ` · ${row.department_name}` : ""}
            {row.ip_address ? ` · ${row.ip_address}` : ""}
          </DialogDescription>
        </DialogHeader>
        {row.reason ? (
          <p className="text-sm">
            <span className="font-medium">Reason: </span>
            {row.reason}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {row.old_data ? (
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Before</p>
              <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-2 text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(row.old_data, null, 2)}
              </pre>
            </div>
          ) : null}
          {row.new_data ? (
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">After</p>
              <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-2 text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(row.new_data, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogTable({ rows, showDepartment }: { rows: AuditLogRow[]; showDepartment?: boolean }) {
  const [visibleCount, setVisibleCount] = useState(50);
  const visible = rows.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                {showDepartment ? <TableHead>Department</TableHead> : null}
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showDepartment ? 8 : 7} className="text-center text-muted-foreground">
                    No activity recorded for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell>{row.user_name ?? "Unknown user"}</TableCell>
                    {showDepartment ? <TableCell>{row.department_name ?? "-"}</TableCell> : null}
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[row.action]}>{row.action}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.table_name}</TableCell>
                    <TableCell>{row.record_id}</TableCell>
                    <TableCell className="max-w-64 truncate">{row.reason ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <AuditLogDetailsDialog row={row} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {visibleCount < rows.length ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setVisibleCount((n) => n + 50)}>
            Load more ({rows.length - visibleCount} remaining)
          </Button>
        </div>
      ) : null}
    </div>
  );
}
