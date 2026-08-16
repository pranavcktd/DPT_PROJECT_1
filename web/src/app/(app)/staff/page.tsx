import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { StaffFormDialog } from "./staff-form-dialog";
import { StaffTable } from "./staff-table";

export default async function StaffPage() {
  const { user, can_create, can_edit } = await getModulePermissions("USER_MANAGEMENT");
  const theme = MODULE_THEME.staff;
  const departmentId = BigInt(user.departmentId);

  const [users, enabledModules, roles] = await Promise.all([
    db.users.findMany({
      where: { department_id: departmentId },
      include: { roles: true, user_module_permissions: true },
      orderBy: { name: "asc" },
    }),
    db.department_modules.findMany({
      where: { department_id: departmentId, is_enabled: true, modules: { module_code: { not: "DASHBOARD" } } },
      include: { modules: true },
      orderBy: { module_id: "asc" },
    }),
    db.roles.findMany({ where: { role_code: { not: "SUPER_ADMIN" } }, orderBy: { id: "asc" } }),
  ]);

  const moduleOptions = enabledModules.map((dm) => ({
    id: dm.modules.id.toString(),
    module_name: dm.modules.module_name,
  }));
  const roleOptions = roles.map((r) => ({ id: r.id.toString(), role_name: r.role_name }));

  const rows = users.map((u) => ({
    id: u.id.toString(),
    name: u.name,
    email: u.email,
    phone: u.phone ?? "",
    role_id: u.role_id.toString(),
    role_name: u.roles.role_name,
    status: u.status,
    isSelf: u.id === BigInt(user.id),
    permissions: Object.fromEntries(
      u.user_module_permissions.map((p) => [
        p.module_id.toString(),
        {
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        },
      ])
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="staff"
        title="Staff Management"
        description="Create staff accounts and control what each person can see and do."
        action={
          can_create ? (
            <StaffFormDialog
              roles={roleOptions}
              modules={moduleOptions}
              triggerLabel="New Staff"
              triggerClassName={theme.button}
            />
          ) : null
        }
      />
      <StaffTable rows={rows} roles={roleOptions} modules={moduleOptions} can_edit={can_edit} />
    </div>
  );
}
