"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { contractorFormSchema, type ContractorFormValues } from "./schema";
import { uniqueConstraintFields } from "@/lib/prisma-errors";

export type ActionState = { error: string | null; success?: boolean; contractorId?: string };

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
    district: toNullable(values.district),
    state: toNullable(values.state),
    pin_code: toNullable(values.pin_code),
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

function friendlyErrorFor(error: unknown, values: ContractorFormValues): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const fields = uniqueConstraintFields(error);
      if (fields.includes("pan_number")) return `A contractor with PAN "${values.pan_number}" already exists.`;
      if (fields.includes("vendor_code")) return `A contractor with vendor code "${values.vendor_code}" already exists.`;
      return "A contractor with this value already exists.";
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

    revalidatePath("/contractors");
    return { error: null, success: true, contractorId: contractor.id.toString() };
  } catch (error) {
    const message = friendlyErrorFor(error, parsed.data);
    return { error: message };
  }
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
    const message = friendlyErrorFor(error, parsed.data);
    return { error: message };
  }

  revalidatePath("/contractors");
  return { error: null, success: true };
}
