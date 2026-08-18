"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { parseCsvRows, summarizeImport, type ImportRowResult, type ImportSummary } from "@/lib/csv-import";
import { uniqueConstraintFields } from "@/lib/prisma-errors";
import { employeeFormSchema } from "./schema";

export type ImportActionState = { error: string | null; summary?: ImportSummary };

const employeeImportRowSchema = employeeFormSchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().or(z.literal("")),
});

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}
function toNullableDate(value?: string): Date | null {
  return value && value.length > 0 ? new Date(value) : null;
}

function friendlyRowError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const fields = uniqueConstraintFields(error);
    if (fields.includes("employee_code")) {
      return "Duplicate Employee ID - an employee with this Employee ID already exists.";
    }
    return "Duplicate PAN - an employee with this PAN already exists.";
  }
  return error instanceof Error ? error.message : "Unknown error";
}

export async function importEmployees(_prev: ImportActionState, formData: FormData): Promise<ImportActionState> {
  const user = await requireModulePermission("EMPLOYEE_MASTER", "create");
  const departmentId = BigInt(user.departmentId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a CSV file to upload." };
  }

  let rows: Record<string, string>[];
  try {
    rows = parseCsvRows(await file.text());
  } catch {
    return { error: "Could not parse this file - make sure it's a valid CSV." };
  }
  if (rows.length === 0) {
    return { error: "The file has no data rows." };
  }

  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const parsed = employeeImportRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      results.push({ row: rowNumber, error: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    const values = parsed.data;

    try {
      const employee = await db.employees.create({
        data: {
          department_id: departmentId,
          employee_name: values.employee_name,
          pan_number: values.pan_number,
          email: toNullable(values.email),
          designation: toNullable(values.designation),
          employee_code: toNullable(values.employee_code),
          dob: toNullableDate(values.dob),
          mobile: toNullable(values.mobile),
          joining_date: toNullableDate(values.joining_date),
          transfer_date: toNullableDate(values.transfer_date),
          status: values.status || "ACTIVE",
          created_by: BigInt(user.id),
        },
      });
      await writeAuditLog({
        departmentId,
        performedBy: BigInt(user.id),
        tableName: "employees",
        recordId: employee.id,
        action: "CREATE",
        newData: employee,
        reason: "Bulk imported from CSV",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRowError(error) });
    }
  }

  revalidatePath("/employees");
  return { error: null, summary: summarizeImport(results) };
}
