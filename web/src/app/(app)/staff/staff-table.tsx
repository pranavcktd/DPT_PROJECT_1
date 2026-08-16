"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { StaffFormDialog } from "./staff-form-dialog";
import { ResetStaffPasswordDialog } from "./reset-staff-password-dialog";
import { formatDateTime } from "@/lib/utils";
import type { PermissionsMap } from "./schema";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role_id: string;
  role_name: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  last_login_at: string | null;
  last_logout_at: string | null;
  isSelf: boolean;
  permissions: PermissionsMap;
};

type RoleOption = { id: string; role_name: string };
type ModuleOption = { id: string; module_name: string };

const STATUS_VARIANT: Record<StaffRow["status"], "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  SUSPENDED: "destructive",
};

export function StaffTable({
  rows,
  roles,
  modules,
  can_edit,
}: {
  rows: StaffRow[];
  roles: RoleOption[];
  modules: ModuleOption[];
  can_edit: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.name} ${r.email} ${r.role_name}`.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email, role..." />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Last Logout</TableHead>
                {can_edit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {rows.length === 0 ? "No staff accounts yet." : "No staff match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.name}
                      {r.isSelf ? <span className="ml-1.5 text-xs text-muted-foreground">(you)</span> : null}
                    </TableCell>
                    <TableCell>{r.email}</TableCell>
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
                    {can_edit ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <StaffFormDialog
                            staff={r}
                            roles={roles}
                            modules={modules}
                            triggerLabel="Edit"
                            triggerVariant="outline"
                            triggerSize="sm"
                          />
                          <ResetStaffPasswordDialog userId={r.id} name={r.name} />
                        </div>
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
