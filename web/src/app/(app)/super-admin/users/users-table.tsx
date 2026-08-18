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
  department_id: string | null;
  department_name: string;
  tenant_code: string | null;
  role_name: string;
  role_code: string;
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

type DepartmentGroup = {
  key: string;
  department_name: string;
  tenant_code: string | null;
  users: SuperAdminUserRow[];
};

function groupByDepartment(rows: SuperAdminUserRow[]): DepartmentGroup[] {
  const groups = new Map<string, DepartmentGroup>();
  for (const r of rows) {
    const key = r.department_id ?? "__software_company__";
    if (!groups.has(key)) {
      groups.set(key, { key, department_name: r.department_name, tenant_code: r.tenant_code, users: [] });
    }
    groups.get(key)!.users.push(r);
  }
  // Department Admin first within each group, then everyone else alphabetically.
  for (const g of groups.values()) {
    g.users.sort((a, b) => {
      if (a.role_code === "DEPARTMENT_ADMIN" && b.role_code !== "DEPARTMENT_ADMIN") return -1;
      if (b.role_code === "DEPARTMENT_ADMIN" && a.role_code !== "DEPARTMENT_ADMIN") return 1;
      return a.name.localeCompare(b.name);
    });
  }
  return Array.from(groups.values()).sort((a, b) => a.department_name.localeCompare(b.department_name));
}

function UserRow({ r }: { r: SuperAdminUserRow }) {
  return (
    <TableRow key={r.id}>
      <TableCell className="font-medium">
        {r.name}
        {r.role_code === "DEPARTMENT_ADMIN" ? <Badge variant="outline" className="ml-2">Admin</Badge> : null}
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
  );
}

function DepartmentGroupSection({ group, forceOpen }: { group: DepartmentGroup; forceOpen: boolean }) {
  const activeCount = group.users.filter((u) => u.status === "ACTIVE").length;
  return (
    <details className="group rounded-xl border bg-card" {...(forceOpen ? { open: true } : {})}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-muted-foreground transition-transform group-open:rotate-90">▶</span>
          <p className="font-medium">{group.department_name}</p>
          {group.tenant_code ? <Badge variant="outline">{group.tenant_code}</Badge> : null}
          <span className="text-xs text-muted-foreground">
            {group.users.length} user{group.users.length === 1 ? "" : "s"} · {activeCount} active
          </span>
        </div>
      </summary>
      <div className="overflow-x-auto border-t px-4 pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Last Logout</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.users.map((r) => (
              <UserRow key={r.id} r={r} />
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}

export function SuperAdminUsersTable({ rows }: { rows: SuperAdminUserRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.name} ${r.email} ${r.department_name} ${r.role_name}`.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const groups = useMemo(() => groupByDepartment(filtered), [filtered]);
  const searching = query.trim().length > 0;

  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email, department, role..." />
      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {rows.length === 0 ? "No users yet." : "No users match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <DepartmentGroupSection key={`${g.key}-${searching}`} group={g} forceOpen={searching} />
          ))}
        </div>
      )}
    </div>
  );
}
