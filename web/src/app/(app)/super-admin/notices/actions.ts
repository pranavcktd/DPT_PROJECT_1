"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { noticeFormSchema } from "./schema";

export type ActionState = { error: string | null; success?: boolean };

function toNullableDate(value?: string): Date | null {
  return value && value.length > 0 ? new Date(value) : null;
}
function toNullableBigInt(value?: string): bigint | null {
  return value && value.length > 0 ? BigInt(value) : null;
}

function buildData(values: ReturnType<typeof noticeFormSchema.parse>) {
  return {
    title: values.title,
    message: values.message,
    department_id: toNullableBigInt(values.department_id),
    starts_at: toNullableDate(values.starts_at),
    expires_at: toNullableDate(values.expires_at),
  };
}

export async function createNotice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const parsed = noticeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const notice = await db.notices.create({
    data: { ...buildData(parsed.data), is_active: true, created_by: BigInt(superAdmin.id) },
  });

  await writeAuditLog({
    departmentId: notice.department_id,
    performedBy: BigInt(superAdmin.id),
    tableName: "notices",
    recordId: notice.id,
    action: "CREATE",
    newData: notice,
  });

  revalidatePath("/super-admin/notices");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function updateNotice(noticeId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const parsed = noticeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const id = BigInt(noticeId);
  const existing = await db.notices.findUniqueOrThrow({ where: { id } });
  const updated = await db.notices.update({ where: { id }, data: buildData(parsed.data) });

  await writeAuditLog({
    departmentId: updated.department_id,
    performedBy: BigInt(superAdmin.id),
    tableName: "notices",
    recordId: updated.id,
    action: "UPDATE",
    oldData: existing,
    newData: updated,
  });

  revalidatePath("/super-admin/notices");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function setNoticeActive(noticeId: string, isActive: boolean): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const id = BigInt(noticeId);
  const existing = await db.notices.findUniqueOrThrow({ where: { id } });
  const updated = await db.notices.update({ where: { id }, data: { is_active: isActive } });

  await writeAuditLog({
    departmentId: updated.department_id,
    performedBy: BigInt(superAdmin.id),
    tableName: "notices",
    recordId: updated.id,
    action: "UPDATE",
    oldData: existing,
    newData: updated,
    reason: isActive ? "Notice re-activated by Super Admin" : "Notice deactivated by Super Admin",
  });

  revalidatePath("/super-admin/notices");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function deleteNotice(noticeId: string): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const id = BigInt(noticeId);
  const existing = await db.notices.findUniqueOrThrow({ where: { id } });

  await db.notices.delete({ where: { id } });

  await writeAuditLog({
    departmentId: existing.department_id,
    performedBy: BigInt(superAdmin.id),
    tableName: "notices",
    recordId: id,
    action: "DELETE",
    oldData: existing,
    reason: "Notice deleted by Super Admin",
  });

  revalidatePath("/super-admin/notices");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}
