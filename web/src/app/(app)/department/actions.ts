"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { departmentProfileSchema, ddoFormSchema } from "./schema";

export type ActionState = { error: string | null; success?: boolean };

const ALLOWED_LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg" };
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}
function toNullableDate(value?: string): Date | null {
  return value && value.length > 0 ? new Date(value) : null;
}

function friendlyErrorFor(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Another department is already registered with this GSTIN or PAN.";
  }
  throw error;
}

export async function updateDepartmentProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("DEPARTMENT_SETTINGS", "edit");
  const parsed = departmentProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const departmentId = BigInt(user.departmentId);

  // Logo upload: written straight to the local filesystem for local dev.
  // Vercel's filesystem is ephemeral in production - this must move to
  // object storage (e.g. Vercel Blob) before deploying (see README).
  let logoPath: string | undefined;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const ext = ALLOWED_LOGO_TYPES[logoFile.type];
    if (!ext) {
      return { error: "Logo must be a PNG or JPEG image." };
    }
    if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
      return { error: "Logo must be smaller than 2MB." };
    }
    const fileName = `dept-${departmentId}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");
    await mkdir(uploadDir, { recursive: true });
    const bytes = Buffer.from(await logoFile.arrayBuffer());
    await writeFile(path.join(uploadDir, fileName), bytes);
    logoPath = `/uploads/logos/${fileName}`;
  }

  const existing = await db.departments.findUniqueOrThrow({ where: { id: departmentId } });

  try {
    const updated = await db.departments.update({
      where: { id: departmentId },
      data: {
        department_name: parsed.data.department_name,
        office_address: toNullable(parsed.data.office_address),
        district: toNullable(parsed.data.district),
        state: toNullable(parsed.data.state),
        gstin: toNullable(parsed.data.gstin),
        gstin_registration_date: toNullableDate(parsed.data.gstin_registration_date),
        pan: toNullable(parsed.data.pan),
        tan: toNullable(parsed.data.tan),
        official_email: toNullable(parsed.data.official_email),
        contact_number: toNullable(parsed.data.contact_number),
        ...(logoPath ? { logo_path: logoPath } : {}),
      },
    });

    await writeAuditLog({
      departmentId,
      performedBy: BigInt(user.id),
      tableName: "departments",
      recordId: updated.id,
      action: "UPDATE",
      oldData: existing,
      newData: updated,
    });
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }

  revalidatePath("/department");
  return { error: null, success: true };
}

export async function upsertDdo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("DEPARTMENT_SETTINGS", "edit");
  const parsed = ddoFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const departmentId = BigInt(user.departmentId);
  const existing = await db.ddo_details.findFirst({ where: { department_id: departmentId, is_primary: true } });

  const data = {
    ddo_name: parsed.data.ddo_name,
    designation: parsed.data.designation,
    ddo_code: toNullable(parsed.data.ddo_code),
    treasury_registration_code: toNullable(parsed.data.treasury_registration_code),
  };

  const ddo = existing
    ? await db.ddo_details.update({ where: { id: existing.id }, data })
    : await db.ddo_details.create({
        data: { department_id: departmentId, is_primary: true, status: "ACTIVE", ...data },
      });

  await writeAuditLog({
    departmentId,
    performedBy: BigInt(user.id),
    tableName: "ddo_details",
    recordId: ddo.id,
    action: existing ? "UPDATE" : "CREATE",
    oldData: existing ?? undefined,
    newData: ddo,
  });

  revalidatePath("/department");
  return { error: null, success: true };
}
