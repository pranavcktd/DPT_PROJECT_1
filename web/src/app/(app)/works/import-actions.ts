"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { parseCsvRows, summarizeImport, type ImportRowResult, type ImportSummary } from "@/lib/csv-import";

export type ImportActionState = { error: string | null; summary?: ImportSummary };

const workImportRowSchema = z.object({
  work_name: z.string().trim().min(1, "Work name is required").max(200),
  scheme_name: z.string().trim().min(1, "Scheme name is required"),
  financial_year: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, "Financial year must look like 2025-2026"),
  sanctioned_cost: z.coerce.number().positive("Must be greater than 0"),
  expected_completion_date: z.string().optional().or(z.literal("")),
  actual_completion_date: z.string().optional().or(z.literal("")),
  status: z.enum(["ONGOING", "COMPLETED", "TERMINATED"]).optional().or(z.literal("")),
});

function toNullableDate(value?: string): Date | null {
  return value && value.length > 0 ? new Date(value) : null;
}

function friendlyRowError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("exceeds remaining scheme budget")) {
    return "Sanctioned cost exceeds the remaining budget for this scheme.";
  }
  return message || "Unknown error";
}

export async function importWorks(_prev: ImportActionState, formData: FormData): Promise<ImportActionState> {
  const user = await requireModulePermission("WORK_MASTER", "create");
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
    const parsed = workImportRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      results.push({ row: rowNumber, error: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    const values = parsed.data;

    const scheme = await db.schemes.findFirst({
      where: { department_id: departmentId, scheme_name: values.scheme_name, financial_year: values.financial_year },
    });
    if (!scheme) {
      results.push({ row: rowNumber, error: `No scheme named "${values.scheme_name}" for FY ${values.financial_year}.` });
      continue;
    }

    try {
      const work = await db.works.create({
        data: {
          department_id: departmentId,
          scheme_id: scheme.id,
          work_name: values.work_name,
          sanctioned_cost: values.sanctioned_cost,
          expected_completion_date: toNullableDate(values.expected_completion_date),
          actual_completion_date: toNullableDate(values.actual_completion_date),
          status: values.status || "ONGOING",
          created_by: BigInt(user.id),
        },
      });
      await writeAuditLog({
        departmentId,
        performedBy: BigInt(user.id),
        tableName: "works",
        recordId: work.id,
        action: "CREATE",
        newData: work,
        reason: "Bulk imported from CSV",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRowError(error) });
    }
  }

  revalidatePath("/works");
  revalidatePath("/schemes");
  return { error: null, summary: summarizeImport(results) };
}
