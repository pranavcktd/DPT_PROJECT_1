"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { formatDateTime } from "@/lib/utils";
import { ChangeUserStatusDialog, ResetUserPasswordDialog } from "./user-row-actions";

export type SuperAdminUserRow = {
  id: string;
  name: string;
  email: string;
  department_name: string;
  role_name: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  last_login_at: string | null;
  last_logout_at: string | null;
  isManageable: boolean;
};

const STATUS_VARIANT: Record<SuperAdminUserRow["status"], "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  SUSPENDED: "destructive",
};

export function SuperAdminUsersTable({ rows }: { rows: SuperAdminUserRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.name} ${r.email} ${r.department_name} ${r.role_name}`.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email, department, role..." />
      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Last Logout</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {rows.length === 0 ? "No users yet." : "No users match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.department_name}</TableCell>
                    <TableCell>{r.role_name}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.last_login_at ? formatDateTime(r.last_login_at) : "Never"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.last_logout_at ? formatDateTime(r.last_logout_at) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.isManageable ? (
                        <div className="flex justify-end gap-2">
                          <ChangeUserStatusDialog userId={r.id} name={r.name} status={r.status} />
                          <ResetUserPasswordDialog userId={r.id} name={r.name} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Software company staff</span>
                      )}
                    </TableCell>
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
