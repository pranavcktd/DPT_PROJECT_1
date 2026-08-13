import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type ModuleCode =
  | "DASHBOARD"
  | "CONTRACTOR_MASTER"
  | "SCHEME_MASTER"
  | "WORK_MASTER"
  | "PAYMENT_ENTRY"
  | "PAYMENT_CERTIFICATE"
  | "WORK_EXPERIENCE_CERTIFICATE"
  | "TAX_LEDGER_REPORT"
  | "AUDIT_LOGS"
  | "USER_MANAGEMENT"
  | "DEPARTMENT_SETTINGS";

export type PermissionAction = "view" | "create" | "edit" | "delete";

export type RoleCode =
  | "SUPER_ADMIN"
  | "DEPARTMENT_ADMIN"
  | "EXECUTIVE_ENGINEER"
  | "DATA_ENTRY_OPERATOR"
  | "AUDITOR";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not authorized for this action") {
    super(message);
  }
}

/**
 * Secure (DB-session-backed via JWT) check - call this at the top of every
 * Server Component, Server Action, and Route Handler that touches tenant
 * data. Proxy only does an optimistic cookie check; this is the real gate.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthenticatedError();
  return session.user;
}

export async function requireRole(...allowed: RoleCode[]) {
  const user = await requireUser();
  if (!allowed.includes(user.roleCode as RoleCode)) {
    throw new ForbiddenError(`Requires one of: ${allowed.join(", ")}`);
  }
  return user;
}

/** Super Admin (software company) - the only role with no departmentId. */
export async function requireSuperAdmin() {
  return requireRole("SUPER_ADMIN");
}

/**
 * Department-scoped users (everyone except SUPER_ADMIN) must have a
 * departmentId - use this in any query that filters by department_id.
 */
export async function requireDepartmentUser() {
  const user = await requireUser();
  if (user.roleCode === "SUPER_ADMIN" || !user.departmentId) {
    throw new ForbiddenError("Requires a department-scoped account");
  }
  return { ...user, departmentId: user.departmentId };
}

/**
 * Two-layer RBAC per the schema design: the department must have the module
 * enabled (Super Admin's subscription control), AND the user must have the
 * specific permission (Department Admin's staff-permission control).
 *
 * Returns all four CRUD flags so pages can conditionally render UI
 * (e.g. hide "New" button when can_create is false) in one query.
 */
export async function getModulePermissions(moduleCode: ModuleCode) {
  const user = await requireDepartmentUser();
  const departmentId = BigInt(user.departmentId);

  const moduleRow = await db.modules.findUnique({ where: { module_code: moduleCode } });
  if (!moduleRow) throw new ForbiddenError(`Unknown module: ${moduleCode}`);

  const deptModule = await db.department_modules.findUnique({
    where: { department_id_module_id: { department_id: departmentId, module_id: moduleRow.id } },
  });
  if (!deptModule?.is_enabled) {
    throw new ForbiddenError(`${moduleCode} is not enabled for this department`);
  }

  const permission = await db.user_module_permissions.findUnique({
    where: { user_id_module_id: { user_id: BigInt(user.id), module_id: moduleRow.id } },
  });

  return {
    user: { ...user, departmentId: user.departmentId },
    can_view: !!permission?.can_view,
    can_create: !!permission?.can_create,
    can_edit: !!permission?.can_edit,
    can_delete: !!permission?.can_delete,
  };
}

export async function requireModulePermission(moduleCode: ModuleCode, action: PermissionAction) {
  const permissions = await getModulePermissions(moduleCode);
  const allowed =
    action === "view"
      ? permissions.can_view
      : action === "create"
        ? permissions.can_create
        : action === "edit"
          ? permissions.can_edit
          : permissions.can_delete;

  if (!allowed) {
    throw new ForbiddenError(`Missing "${action}" permission on ${moduleCode}`);
  }

  return permissions.user;
}
