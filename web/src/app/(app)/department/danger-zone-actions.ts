"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { clearDepartmentData } from "@/lib/data-wipe";
import type { ClearDataState } from "@/components/clear-data-dialog";

export async function clearOwnDepartmentData(confirmTenantCode: string): Promise<ClearDataState> {
  const user = await requireModulePermission("DEPARTMENT_SETTINGS", "edit");
  const departmentId = BigInt(user.departmentId);
  const department = await db.departments.findUniqueOrThrow({ where: { id: departmentId } });

  if (confirmTenantCode.trim().toUpperCase() !== department.tenant_code.toUpperCase()) {
    return { error: "Tenant code confirmation does not match. Nothing was deleted." };
  }

  const notifyEmail =
    department.official_email ?? (await db.users.findUniqueOrThrow({ where: { id: BigInt(user.id) }, select: { email: true } })).email;
  const { backupZip, emailSent, deletedCounts } = await clearDepartmentData(departmentId, BigInt(user.id), notifyEmail);

  revalidatePath("/department");
  return {
    error: null,
    success: true,
    backupBase64: backupZip.toString("base64"),
    filename: `${department.tenant_code}-pre-clear-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    emailSent,
    deletedCounts,
  };
}
