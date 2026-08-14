"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { employeeFormSchema, type EmployeeFormValues } from "./schema";

export type ActionState = { error: string | null; success?: boolean };

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}
function toNullableDate(value?: string): Date | null {
  return value && value.length > 0 ? new Date(value) : null;
}

function friendlyErrorFor(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "An employee with this PAN already exists.";
  }
  throw error;
}

function buildData(values: EmployeeFormValues) {
  return {
    employee_name: values.employee_name,
    pan_number: values.pan_number,
    dob: toNullableDate(values.dob),
    mobile: toNullable(values.mobile),
    joining_date: toNullableDate(values.joining_date),
    transfer_date: toNullableDate(values.transfer_date),
    status: values.status,
  };
}

export async function createEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("EMPLOYEE_MASTER", "create");
  const parsed = employeeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const departmentId = BigInt(user.departmentId);

  try {
    const employee = await db.employees.create({
      data: { department_id: departmentId, created_by: BigInt(user.id), ...buildData(parsed.data) },
    });

    await writeAuditLog({
      departmentId,
      performedBy: BigInt(user.id),
      tableName: "employees",
      recordId: employee.id,
      action: "CREATE",
      newData: employee,
    });
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }

  revalidatePath("/employees");
  return { error: null, success: true };
}

export async function updateEmployee(employeeId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireModulePermission("EMPLOYEE_MASTER", "edit");
  const parsed = employeeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const departmentId = BigInt(user.departmentId);
  const id = BigInt(employeeId);

  const existing = await db.employees.findFirst({ where: { id, department_id: departmentId } });
  if (!existing) return { error: "Employee not found." };

  try {
    const updated = await db.employees.update({ where: { id }, data: buildData(parsed.data) });

    await writeAuditLog({
      departmentId,
      performedBy: BigInt(user.id),
      tableName: "employees",
      recordId: updated.id,
      action: "UPDATE",
      oldData: existing,
      newData: updated,
    });
  } catch (error) {
    return { error: friendlyErrorFor(error) };
  }

  revalidatePath("/employees");
  return { error: null, success: true };
}
