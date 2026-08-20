"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { brandingFormSchema } from "./schema";

export type ActionState = { error: string | null; success?: boolean };

function toNullable(value: string): string | null {
  return value.length > 0 ? value : null;
}

export async function updateBranding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const superAdmin = await requireSuperAdmin();
  const parsed = brandingFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const values = parsed.data;

  const data = {
    company_name: values.company_name,
    tagline: values.tagline,
    contact_email: toNullable(values.contact_email),
    contact_phone: toNullable(values.contact_phone),
    updated_by: BigInt(superAdmin.id),
  };

  const existing = await db.app_branding.findFirst({ orderBy: { id: "asc" } });
  const updated = existing
    ? await db.app_branding.update({ where: { id: existing.id }, data })
    : await db.app_branding.create({ data });

  await writeAuditLog({
    departmentId: null,
    performedBy: BigInt(superAdmin.id),
    tableName: "app_branding",
    recordId: updated.id,
    action: existing ? "UPDATE" : "CREATE",
    oldData: existing ?? undefined,
    newData: updated,
    reason: "Login page / in-app branding and contact details updated",
  });

  revalidatePath("/super-admin/branding");
  revalidatePath("/login");
  revalidatePath("/dashboard", "layout");
  return { error: null, success: true };
}
