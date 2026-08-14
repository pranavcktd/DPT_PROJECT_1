"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { onboardDepartmentSchema, subscriptionSchema } from "./schema";
import { DEFAULT_PASSWORD } from "./constants";

export type ActionState = { error: string | null; success?: boolean; tenantCode?: string; email?: string };

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

function toNullableNumber(value: number | "" | undefined): number | null {
  return value === undefined || value === "" ? null : value;
}

function friendlyErrorFor(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = (error.meta?.target as string[] | undefined)?.join(", ");
    if (target?.includes("tenant_code")) return "A department with this tenant code already exists.";
    if (target?.includes("official_email") || target?.includes("email")) {
      return "A department or user with this email already exists.";
    }
    if (target?.includes("gstin")) return "A department with this GSTIN already exists.";
    if (target?.includes("pan")) return "A department with this PAN already exists.";
    return "A department with this value already exists.";
  }
  throw error;
}

/**
 * Onboards a new department and auto-creates its initial Department Admin
 * account: login email = the department's official email, default password
 * `Client@123` (the admin changes it via /change-password on first login).
 * All modules are enabled for the department and granted in full to the
 * admin account, matching the seed script's baseline.
 */
export async function onboardDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const parsed = onboardDepartmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const values = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const adminRole = await tx.roles.findUniqueOrThrow({ where: { role_code: "DEPARTMENT_ADMIN" } });
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

      const department = await tx.departments.create({
        data: {
          tenant_code: values.tenant_code,
          department_name: values.department_name,
          office_address: toNullable(values.office_address),
          district: toNullable(values.district),
          state: toNullable(values.state),
          gstin: toNullable(values.gstin),
          pan: toNullable(values.pan),
          official_email: values.official_email,
          contact_number: toNullable(values.contact_number),
          status: "ACTIVE",
          subscription_amount: toNullableNumber(values.subscription_amount),
          subscription_start_date: values.subscription_start_date ? new Date(values.subscription_start_date) : null,
          subscription_days: toNullableNumber(values.subscription_days),
          created_by: BigInt(superAdmin.id),
        },
      });

      const admin = await tx.users.create({
        data: {
          department_id: department.id,
          role_id: adminRole.id,
          name: `${values.department_name} Admin`,
          email: values.official_email,
          password_hash: passwordHash,
          status: "ACTIVE",
          created_by: BigInt(superAdmin.id),
        },
      });

      const allModules = await tx.modules.findMany();
      await tx.department_modules.createMany({
        data: allModules.map((m) => ({
          department_id: department.id,
          module_id: m.id,
          is_enabled: true,
          enabled_by: BigInt(superAdmin.id),
        })),
      });
      await tx.user_module_permissions.createMany({
        data: allModules.map((m) => ({
          user_id: admin.id,
          module_id: m.id,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
        })),
      });

      return department;
    }, { maxWait: 15000, timeout: 20000 }); // generous - Neon's serverless connections can be slow to wake from idle

    await writeAuditLog({
      departmentId: result.id,
      performedBy: BigInt(superAdmin.id),
      tableName: "departments",
      recordId: result.id,
      action: "CREATE",
      newData: result,
    });
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }

  revalidatePath("/super-admin/departments");
  return { error: null, success: true };
}

export async function updateSubscription(
  departmentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const parsed = subscriptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const id = BigInt(departmentId);
  const existing = await db.departments.findUniqueOrThrow({ where: { id } });

  const updated = await db.departments.update({
    where: { id },
    data: {
      subscription_amount: toNullableNumber(parsed.data.subscription_amount),
      subscription_start_date: parsed.data.subscription_start_date ? new Date(parsed.data.subscription_start_date) : null,
      subscription_days: toNullableNumber(parsed.data.subscription_days),
    },
  });

  await writeAuditLog({
    departmentId: id,
    performedBy: BigInt(superAdmin.id),
    tableName: "departments",
    recordId: id,
    action: "UPDATE",
    oldData: existing,
    newData: updated,
  });

  revalidatePath("/super-admin/departments");
  return { error: null, success: true };
}

export async function setDepartmentStatus(departmentId: string, status: "ACTIVE" | "INACTIVE"): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const id = BigInt(departmentId);
  const existing = await db.departments.findUniqueOrThrow({ where: { id } });

  const updated = await db.departments.update({ where: { id }, data: { status } });

  await writeAuditLog({
    departmentId: id,
    performedBy: BigInt(superAdmin.id),
    tableName: "departments",
    recordId: id,
    action: "UPDATE",
    oldData: existing,
    newData: updated,
    reason: status === "INACTIVE" ? "Department disabled by Super Admin" : "Department re-enabled by Super Admin",
  });

  revalidatePath("/super-admin/departments");
  return { error: null, success: true };
}

/** Hard delete - cascades to every record owned by the department (contractors, schemes, works, payments, users, ...). */
export async function deleteDepartment(departmentId: string, confirmTenantCode: string): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const id = BigInt(departmentId);
  const existing = await db.departments.findUniqueOrThrow({ where: { id } });

  if (confirmTenantCode.trim().toUpperCase() !== existing.tenant_code.toUpperCase()) {
    return { error: "Tenant code confirmation does not match. Nothing was deleted." };
  }

  await db.departments.delete({ where: { id } });

  await writeAuditLog({
    departmentId: null,
    performedBy: BigInt(superAdmin.id),
    tableName: "departments",
    recordId: id,
    action: "DELETE",
    oldData: existing,
    reason: "Department deleted by Super Admin",
  });

  revalidatePath("/super-admin/departments");
  return { error: null, success: true };
}

/** Resets the department's Department Admin account back to the default onboarding password. */
export async function resetDepartmentAdminPassword(departmentId: string): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const id = BigInt(departmentId);

  const admin = await db.users.findFirst({
    where: { department_id: id, roles: { role_code: "DEPARTMENT_ADMIN" } },
    orderBy: { created_at: "asc" },
  });
  if (!admin) return { error: "No Department Admin account found for this department." };

  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await db.users.update({ where: { id: admin.id }, data: { password_hash } });

  await writeAuditLog({
    departmentId: id,
    performedBy: BigInt(superAdmin.id),
    tableName: "users",
    recordId: admin.id,
    action: "UPDATE",
    reason: "Department Admin password reset to default by Super Admin",
  });

  revalidatePath("/super-admin/departments");
  return { error: null, success: true, email: admin.email };
}
