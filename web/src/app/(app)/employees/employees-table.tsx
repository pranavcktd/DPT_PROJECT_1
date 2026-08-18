"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { PaginationBar } from "@/components/pagination-bar";
import { usePagination } from "@/hooks/use-pagination";
import { EmployeeFormDialog } from "./employee-form-dialog";

export type EmployeeRow = {
  id: string;
  employee_name: string;
  pan_number: string;
  email: string;
  designation: string;
  employee_code: string;
  dob: string;
  mobile: string;
  joining_date: string;
  transfer_date: string;
  status: "ACTIVE" | "INACTIVE";
};

export function EmployeesTable({ employees, can_edit }: { employees: EmployeeRow[]; can_edit: boolean }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees
      .filter((e) => `${e.employee_name} ${e.pan_number} ${e.mobile} ${e.employee_code}`.toLowerCase().includes(q));
  }, [employees, query]);
  const paged = usePagination(filtered, 10);

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by employee name, PAN, mobile..." />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead>Transfer Date</TableHead>
                <TableHead>Status</TableHead>
                {can_edit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    {employees.length === 0 ? "No employees yet." : "No employees match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                paged.pageItems.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.employee_name}</TableCell>
                    <TableCell>{e.employee_code || "-"}</TableCell>
                    <TableCell>{e.pan_number}</TableCell>
                    <TableCell>{e.designation || "-"}</TableCell>
                    <TableCell>{e.mobile || "-"}</TableCell>
                    <TableCell>{e.joining_date || "-"}</TableCell>
                    <TableCell>{e.transfer_date || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "ACTIVE" ? "default" : "secondary"}>{e.status}</Badge>
                    </TableCell>
                    {can_edit ? (
                      <TableCell className="text-right">
                        <EmployeeFormDialog employee={e} triggerLabel="Edit" triggerVariant="outline" triggerSize="sm" />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
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
