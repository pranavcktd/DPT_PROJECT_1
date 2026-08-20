"use server";

import { revalidatePath } from "next/cache";
import { requireModulePermission } from "@/lib/session";
import { restoreDepartmentBackupZip } from "@/lib/backup";
import type { ImportSummary } from "@/lib/csv-import";

export type BackupRestoreState = { error: string | null; summary?: Record<string, ImportSummary> };

export async function restoreOwnDepartmentBackup(_prev: BackupRestoreState, formData: FormData): Promise<BackupRestoreState> {
  const user = await requireModulePermission("DEPARTMENT_SETTINGS", "edit");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a backup .zip file to upload." };
  }

  let summary: Record<string, ImportSummary>;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    summary = await restoreDepartmentBackupZip(buffer, BigInt(user.departmentId), BigInt(user.id));
  } catch {
    return { error: "Could not read this file - make sure it's a backup .zip downloaded from this app." };
  }

  revalidatePath("/department");
  return { error: null, summary };
}
