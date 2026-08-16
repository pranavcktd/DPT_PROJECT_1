import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { SuperAdminUsersTable, type SuperAdminUserRow } from "./users-table";

export default async function SuperAdminUsersPage() {
  await requireSuperAdmin();

  const users = await db.users.findMany({
    include: {
      roles: { select: { role_name: true } },
      departments_users_department_idTodepartments: { select: { department_name: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows: SuperAdminUserRow[] = users.map((u) => ({
    id: u.id.toString(),
    name: u.name,
    email: u.email,
    department_name: u.departments_users_department_idTodepartments?.department_name ?? "Software Company",
    role_name: u.roles.role_name,
    status: u.status,
    last_login_at: u.last_login_at ? u.last_login_at.toISOString() : null,
    last_logout_at: u.last_logout_at ? u.last_logout_at.toISOString() : null,
    isManageable: u.department_id !== null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="staff"
        title="Users"
        description="Every user account across every department, with role, status, and last login/logout activity. Reset a password or change status here when a department can't act on their own account."
      />
      <SuperAdminUsersTable rows={rows} />
    </div>
  );
}
