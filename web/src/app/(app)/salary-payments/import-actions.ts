"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { parseCsvRows, summarizeImport, type ImportRowResult, type ImportSummary } from "@/lib/csv-import";
import { PAYMENT_TYPES } from "./schema";

export type ImportActionState = { error: string | null; summary?: ImportSummary };

const salaryImportRowSchema = z
  .object({
    employee_pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "employee_pan must be a valid PAN matching an existing employee"),
    payment_period_month: z.coerce.number().int().min(1).max(12),
    payment_period_year: z.coerce.number().int().min(2000).max(2100),
    payment_type: z.enum(PAYMENT_TYPES).optional().or(z.literal("")),
    other_type_label: z.string().trim().max(100).optional().or(z.literal("")),
    gross_salary: z.coerce.number().positive("Must be greater than 0"),
    it_deduction_amount: z.coerce.number().min(0).optional().or(z.literal("")),
    pay_mode: z.enum(["TREASURY", "OTHER_THAN_TREASURY"]).optional().or(z.literal("")),
    treasury_token_number: z.string().trim().max(50).optional().or(z.literal("")),
    token_generated_date: z.string().optional().or(z.literal("")),
    actual_payment_date: z.string().optional().or(z.literal("")),
    remarks: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.payment_type !== "OTHER" || (data.other_type_label && data.other_type_label.trim().length > 0), {
    message: "other_type_label is required when payment_type is OTHER",
    path: ["other_type_label"],
  })
  .superRefine((data, ctx) => {
    if (data.token_generated_date && data.actual_payment_date && data.actual_payment_date < data.token_generated_date) {
      ctx.addIssue({
        code: "custom",
        message: "actual_payment_date cannot be before token_generated_date",
        path: ["actual_payment_date"],
      });
    }
  });

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}
function toNullableDate(value?: string): Date | null {
  return value && value.length > 0 ? new Date(value) : null;
}

export async function importSalaryPayments(_prev: ImportActionState, formData: FormData): Promise<ImportActionState> {
  const user = await requireModulePermission("SALARY_PAYMENT_ENTRY", "create");
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
  if (rows.length === 0) return { error: "The file has no data rows." };

  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const parsed = salaryImportRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      results.push({ row: rowNumber, error: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    const values = parsed.data;

    const employee = await db.employees.findFirst({ where: { department_id: departmentId, pan_number: values.employee_pan } });
    if (!employee) {
      results.push({ row: rowNumber, error: `No employee found with PAN ${values.employee_pan}.` });
      continue;
    }

    const payMode = values.pay_mode || "TREASURY";

    try {
      const payment = await db.salary_payments.create({
        data: {
          department_id: departmentId,
          employee_id: employee.id,
          employee_name_snapshot: employee.employee_name,
          employee_pan_snapshot: employee.pan_number,
          payment_period_month: values.payment_period_month,
          payment_period_year: values.payment_period_year,
          payment_type: values.payment_type || "SALARY",
          other_type_label: values.payment_type === "OTHER" ? toNullable(values.other_type_label) : null,
          gross_salary: values.gross_salary,
          it_deduction_amount: values.it_deduction_amount || 0,
          pay_mode: payMode,
          treasury_token_number: payMode === "TREASURY" ? toNullable(values.treasury_token_number) : null,
          token_generated_date: payMode === "TREASURY" ? toNullableDate(values.token_generated_date) : null,
          actual_payment_date: payMode === "OTHER_THAN_TREASURY" ? toNullableDate(values.actual_payment_date) : null,
          remarks: toNullable(values.remarks),
          status: "SAVED",
          created_by: BigInt(user.id),
        },
      });
      await writeAuditLog({
        departmentId,
        performedBy: BigInt(user.id),
        tableName: "salary_payments",
        recordId: payment.id,
        action: "CREATE",
        newData: payment,
        reason: "Bulk imported from CSV",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  revalidatePath("/salary-payments");
  return { error: null, summary: summarizeImport(results) };
}
