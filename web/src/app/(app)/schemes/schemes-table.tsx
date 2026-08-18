"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
import { usePagination } from "@/hooks/use-pagination";
import { formatINR } from "@/lib/utils";
import { SchemeFormDialog } from "./scheme-form-dialog";

export type SchemeRow = {
  id: string;
  scheme_name: string;
  financial_year: string;
  sanctioned_budget: number;
  allocated: number;
  description: string;
  status: "ACTIVE" | "CLOSED";
};

export function SchemesTable({ schemes, can_edit }: { schemes: SchemeRow[]; can_edit: boolean }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schemes;
    return schemes.filter((s) => `${s.scheme_name} ${s.financial_year}`.toLowerCase().includes(q));
  }, [schemes, query]);
  const paged = usePagination(filtered, 10);

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by scheme name, financial year..." />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scheme Name</TableHead>
                <TableHead>Financial Year</TableHead>
                <TableHead className="text-right">Sanctioned</TableHead>
                <TableHead className="text-right">Allocated to Works</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
                {can_edit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {schemes.length === 0 ? "No schemes yet." : "No schemes match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                paged.pageItems.map((s) => {
                  const remaining = s.sanctioned_budget - s.allocated;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.scheme_name}</TableCell>
                      <TableCell>{s.financial_year}</TableCell>
                      <TableCell className="text-right">{formatINR(s.sanctioned_budget)}</TableCell>
                      <TableCell className="text-right">{formatINR(s.allocated)}</TableCell>
                      <TableCell className={`text-right ${remaining < 0 ? "text-destructive font-medium" : ""}`}>
                        {formatINR(remaining)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>{s.status}</Badge>
                      </TableCell>
                      {can_edit ? (
                        <TableCell className="text-right">
                          <SchemeFormDialog
                            scheme={{
                              id: s.id,
                              scheme_name: s.scheme_name,
                              financial_year: s.financial_year,
                              sanctioned_budget: s.sanctioned_budget,
                              description: s.description,
                              status: s.status,
                            }}
                            triggerLabel="Edit"
                            triggerVariant="outline"
                            triggerSize="sm"
                          />
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
      <PaginationBar
        page={paged.page}
        totalPages={paged.totalPages}
        totalItems={paged.totalItems}
        pageSize={paged.pageSize}
        effectivePageSize={paged.effectivePageSize}
        onPageChange={paged.setPage}
        onPageSizeChange={paged.setPageSize}
      />
    </div>
  );
}
