"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { restoreDepartmentBackupZip } from "@/lib/backup";
import { clearDepartmentData } from "@/lib/data-wipe";
import type { ImportSummary } from "@/lib/csv-import";
import type { ClearDataState } from "@/components/clear-data-dialog";

export type BackupRestoreState = { error: string | null; summary?: Record<string, ImportSummary> };

export async function restoreDepartmentBackupAsSuperAdmin(
  departmentId: string,
  _prev: BackupRestoreState,
  formData: FormData,
): Promise<BackupRestoreState> {
  const superAdmin = await requireSuperAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a backup .zip file to upload." };
  }

  let summary: Record<string, ImportSummary>;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    summary = await restoreDepartmentBackupZip(buffer, BigInt(departmentId), BigInt(superAdmin.id));
  } catch {
    return { error: "Could not read this file - make sure it's a backup .zip downloaded from this app." };
  }

  revalidatePath("/super-admin/departments");
  return { error: null, summary };
}

export async function clearDepartmentDataAsSuperAdmin(
  departmentId: string,
  confirmTenantCode: string,
): Promise<ClearDataState> {
  const superAdmin = await requireSuperAdmin();
  const id = BigInt(departmentId);
  const department = await db.departments.findUniqueOrThrow({ where: { id } });

  if (confirmTenantCode.trim().toUpperCase() !== department.tenant_code.toUpperCase()) {
    return { error: "Tenant code confirmation does not match. Nothing was deleted." };
  }

  const notifyEmail =
    department.official_email ??
    (await db.users.findFirst({ where: { department_id: id, roles: { role_code: "DEPARTMENT_ADMIN" } }, select: { email: true } }))
      ?.email ??
    null;
  if (!notifyEmail) {
    return { error: "This department has no official email or admin account to notify - can't safely proceed." };
  }

  const { backupZip, emailSent, deletedCounts } = await clearDepartmentData(id, BigInt(superAdmin.id), notifyEmail);

  revalidatePath("/super-admin/departments");
  return {
    error: null,
    success: true,
    backupBase64: backupZip.toString("base64"),
    filename: `${department.tenant_code}-pre-clear-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    emailSent,
    deletedCounts,
  };
}
