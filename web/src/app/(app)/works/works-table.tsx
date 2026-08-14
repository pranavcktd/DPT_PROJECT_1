"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { formatINR } from "@/lib/utils";
import { WorkFormDialog } from "./work-form-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ONGOING: "default",
  COMPLETED: "secondary",
  TERMINATED: "destructive",
};

export type WorkRow = {
  id: string;
  scheme_id: string;
  scheme_name: string;
  work_name: string;
  sanctioned_cost: number;
  expected_completion_date: string;
  actual_completion_date: string;
  status: "ONGOING" | "COMPLETED" | "TERMINATED";
};

type SchemeOption = { id: string; scheme_name: string; remaining: number };

export function WorksTable({ works, schemeOptions, can_edit }: { works: WorkRow[]; schemeOptions: SchemeOption[]; can_edit: boolean }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return works;
    return works.filter((w) => `${w.work_name} ${w.scheme_name}`.toLowerCase().includes(q));
  }, [works, query]);

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by work name, scheme..." />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Name</TableHead>
                <TableHead>Scheme</TableHead>
                <TableHead className="text-right">Sanctioned</TableHead>
                <TableHead>Status</TableHead>
                {can_edit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {works.length === 0 ? "No work orders yet." : "No work orders match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.work_name}</TableCell>
                    <TableCell>{w.scheme_name}</TableCell>
                    <TableCell className="text-right">{formatINR(w.sanctioned_cost)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[w.status]}>{w.status}</Badge>
                    </TableCell>
                    {can_edit ? (
                      <TableCell className="text-right">
                        <WorkFormDialog
                          schemes={schemeOptions}
                          work={{
                            id: w.id,
                            scheme_id: w.scheme_id,
                            work_name: w.work_name,
                            sanctioned_cost: w.sanctioned_cost,
                            expected_completion_date: w.expected_completion_date,
                            actual_completion_date: w.actual_completion_date,
                            status: w.status,
                          }}
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          triggerSize="sm"
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
