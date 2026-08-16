"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { parseCsvRows, summarizeImport, type ImportRowResult, type ImportSummary } from "@/lib/csv-import";
import { schemeFormSchema } from "./schema";

export type ImportActionState = { error: string | null; summary?: ImportSummary };

const schemeImportRowSchema = schemeFormSchema.extend({
  status: z.enum(["ACTIVE", "CLOSED"]).optional().or(z.literal("")),
});

function friendlyRowError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A scheme with this name already exists for this financial year.";
  }
  return error instanceof Error ? error.message : "Unknown error";
}

export async function importSchemes(_prev: ImportActionState, formData: FormData): Promise<ImportActionState> {
  const user = await requireModulePermission("SCHEME_MASTER", "create");
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
    const parsed = schemeImportRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      results.push({ row: rowNumber, error: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    const values = parsed.data;

    try {
      const scheme = await db.schemes.create({
        data: {
          department_id: departmentId,
          scheme_name: values.scheme_name,
          financial_year: values.financial_year,
          sanctioned_budget: values.sanctioned_budget,
          description: values.description && values.description.length > 0 ? values.description : null,
          status: values.status || "ACTIVE",
          created_by: BigInt(user.id),
        },
      });
      await writeAuditLog({
        departmentId,
        performedBy: BigInt(user.id),
        tableName: "schemes",
        recordId: scheme.id,
        action: "CREATE",
        newData: scheme,
        reason: "Bulk imported from CSV",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRowError(error) });
    }
  }

  revalidatePath("/schemes");
  return { error: null, summary: summarizeImport(results) };
}
