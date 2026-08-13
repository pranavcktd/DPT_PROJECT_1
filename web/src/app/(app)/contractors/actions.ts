"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { contractorFormSchema, type ContractorFormValues } from "./schema";

export type ActionState = { error: string | null; success?: boolean };

function toNullable(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function buildData(values: ContractorFormValues) {
  return {
    firm_name: values.firm_name,
    vendor_code: toNullable(values.vendor_code),
    pan_number: values.pan_number,
    gstin: toNullable(values.gstin),
    address: toNullable(values.address),
    contact_person: toNullable(values.contact_person),
    phone: toNullable(values.phone),
    email: toNullable(values.email),
    bank_name: toNullable(values.bank_name),
    bank_branch: toNullable(values.bank_branch),
    account_number: toNullable(values.account_number),
    ifsc_code: toNullable(values.ifsc_code),
    account_holder_name: toNullable(values.account_holder_name),
    status: values.status,
  };
}

function friendlyErrorFor(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(", ");
      return `A contractor with this ${target?.includes("pan") ? "PAN" : target?.includes("vendor_code") ? "vendor code" : "value"} already exists.`;
    }
  }
  throw error;
}

export async function createContractor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("CONTRACTOR_MASTER", "create");
  const parsed = contractorFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const contractor = await db.contractors.create({
      data: {
        department_id: BigInt(user.departmentId),
        created_by: BigInt(user.id),
        ...buildData(parsed.data),
      },
    });

    await writeAuditLog({
      departmentId: contractor.department_id,
      performedBy: BigInt(user.id),
      tableName: "contractors",
      recordId: contractor.id,
      action: "CREATE",
      newData: contractor,
    });
  } catch (error) {
    const message = friendlyErrorFor(error);
    return { error: message };
  }

  revalidatePath("/contractors");
  return { error: null, success: true };
}

export async function updateContractor(
  contractorId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireModulePermission("CONTRACTOR_MASTER", "edit");
  const parsed = contractorFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const id = BigInt(contractorId);
  const existing = await db.contractors.findFirst({
    where: { id, department_id: BigInt(user.departmentId) },
  });
  if (!existing) return { error: "Contractor not found." };

  try {
    const updated = await db.contractors.update({
      where: { id },
      data: { updated_by: BigInt(user.id), ...buildData(parsed.data) },
    });

    await writeAuditLog({
      departmentId: updated.department_id,
      performedBy: BigInt(user.id),
      tableName: "contractors",
      recordId: updated.id,
      action: "UPDATE",
      oldData: existing,
      newData: updated,
    });
  } catch (error) {
    const message = friendlyErrorFor(error);
    return { error: message };
  }

  revalidatePath("/contractors");
  return { error: null, success: true };
}
