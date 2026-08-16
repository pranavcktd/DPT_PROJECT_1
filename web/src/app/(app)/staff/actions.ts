"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { DEFAULT_PASSWORD } from "@/lib/auth-constants";
import { staffFormSchema, permissionsMapSchema, type PermissionsMap } from "./schema";

export type ActionState = {
  error: string | null;
  success?: boolean;
  temporaryPassword?: string;
};

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

function friendlyErrorFor(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A user with this email already exists.";
  }
  throw error;
}

/** Never trust a client-submitted role id - only these roles are assignable by a Department Admin. */
async function resolveAssignableRole(roleId: string) {
  const role = await db.roles.findFirst({
    where: { id: Number(roleId), role_code: { not: "SUPER_ADMIN" } },
  });
  if (!role) throw new Error("Invalid role selected.");
  return role;
}

/** Never trust client-submitted module ids either - intersect against this department's actually-enabled modules. */
async function resolveEnabledPermissions(departmentId: bigint, permissionsJson: string) {
  const parsedMap = permissionsMapSchema.safeParse(JSON.parse(permissionsJson || "{}"));
  const map: PermissionsMap = parsedMap.success ? parsedMap.data : {};

  const enabledModules = await db.department_modules.findMany({
    where: { department_id: departmentId, is_enabled: true },
    select: { module_id: true },
  });
  const enabledIds = new Set(enabledModules.map((m) => m.module_id.toString()));

  return Object.entries(map)
    .filter(([moduleId]) => enabledIds.has(moduleId))
    .map(([moduleId, flags]) => ({ module_id: Number(moduleId), ...flags }));
}

export async function createStaffUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireModulePermission("USER_MANAGEMENT", "create");
  const parsed = staffFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const departmentId = BigInt(admin.departmentId);

  try {
    const role = await resolveAssignableRole(parsed.data.role_id);
    const permissions = await resolveEnabledPermissions(departmentId, parsed.data.permissions_json);
    const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const user = await db.$transaction(async (tx) => {
      const created = await tx.users.create({
        data: {
          department_id: departmentId,
          role_id: role.id,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: toNullable(parsed.data.phone),
          password_hash,
          must_change_password: true,
          status: parsed.data.status,
          created_by: BigInt(admin.id),
        },
      });

      if (permissions.length > 0) {
        await tx.user_module_permissions.createMany({
          data: permissions.map((p) => ({ user_id: created.id, ...p })),
        });
      }

      return created;
    });

    await writeAuditLog({
      departmentId,
      performedBy: BigInt(admin.id),
      tableName: "users",
      recordId: user.id,
      action: "CREATE",
      newData: user,
      reason: "Staff account created by Department Admin",
    });

    revalidatePath("/staff");
    return { error: null, success: true, temporaryPassword: DEFAULT_PASSWORD };
  } catch (error) {
    return { error: error instanceof Error ? error.message : friendlyErrorFor(error) };
  }
}

export async function updateStaffUser(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireModulePermission("USER_MANAGEMENT", "edit");
  const parsed = staffFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const departmentId = BigInt(admin.departmentId);
  const id = BigInt(userId);

  const existing = await db.users.findFirst({ where: { id, department_id: departmentId } });
  if (!existing) return { error: "Staff user not found." };

  try {
    const role = await resolveAssignableRole(parsed.data.role_id);
    const permissions = await resolveEnabledPermissions(departmentId, parsed.data.permissions_json);

    const updated = await db.$transaction(async (tx) => {
      const user = await tx.users.update({
        where: { id },
        data: {
          role_id: role.id,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: toNullable(parsed.data.phone),
          status: parsed.data.status,
        },
      });

      for (const p of permissions) {
        await tx.user_module_permissions.upsert({
          where: { user_id_module_id: { user_id: id, module_id: p.module_id } },
          update: {
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
          },
          create: { user_id: id, ...p },
        });
      }

      return user;
    });

    await writeAuditLog({
      departmentId,
      performedBy: BigInt(admin.id),
      tableName: "users",
      recordId: updated.id,
      action: "UPDATE",
      oldData: existing,
      newData: updated,
      reason: "Staff account updated by Department Admin",
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : friendlyErrorFor(error) };
  }

  revalidatePath("/staff");
  return { error: null, success: true };
}

export async function resetStaffPassword(userId: string): Promise<ActionState> {
  const admin = await requireModulePermission("USER_MANAGEMENT", "edit");
  const departmentId = BigInt(admin.departmentId);
  const id = BigInt(userId);

  const existing = await db.users.findFirst({ where: { id, department_id: departmentId } });
  if (!existing) return { error: "Staff user not found." };

  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await db.users.update({
    where: { id },
    data: { password_hash, must_change_password: true },
  });

  await writeAuditLog({
    departmentId,
    performedBy: BigInt(admin.id),
    tableName: "users",
    recordId: id,
    action: "UPDATE",
    reason: "Password reset to default by Department Admin",
  });

  revalidatePath("/staff");
  return { error: null, success: true, temporaryPassword: DEFAULT_PASSWORD };
}
