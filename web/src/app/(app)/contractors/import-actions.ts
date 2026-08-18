"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { parseCsvRows, summarizeImport, type ImportRowResult, type ImportSummary } from "@/lib/csv-import";
import { uniqueConstraintFields } from "@/lib/prisma-errors";
import { contractorFormSchema, type ContractorFormValues } from "./schema";

export type ImportActionState = { error: string | null; summary?: ImportSummary };

// Same shape as the New Contractor form, but status defaults to ACTIVE since
// bulk-imported spreadsheets don't usually carry a status column.
const contractorImportRowSchema = contractorFormSchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE", "BLACKLISTED"]).optional().or(z.literal("")),
});

function toNullable(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

function friendlyRowError(error: unknown, values: Pick<ContractorFormValues, "pan_number" | "vendor_code">): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const fields = uniqueConstraintFields(error);
    if (fields.includes("pan_number")) return `Duplicate PAN "${values.pan_number}" - already exists.`;
    if (fields.includes("vendor_code")) return `Duplicate vendor code "${values.vendor_code}" - already exists.`;
    return "Duplicate value - already exists.";
  }
  return error instanceof Error ? error.message : "Unknown error";
}

export async function importContractors(_prev: ImportActionState, formData: FormData): Promise<ImportActionState> {
  const user = await requireModulePermission("CONTRACTOR_MASTER", "create");
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
    const rowNumber = i + 2; // account for the header row, 1-indexed for humans
    const parsed = contractorImportRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      results.push({ row: rowNumber, error: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    const values = parsed.data;

    try {
      const contractor = await db.contractors.create({
        data: {
          department_id: departmentId,
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
          status: values.status || "ACTIVE",
          created_by: BigInt(user.id),
        },
      });
      await writeAuditLog({
        departmentId,
        performedBy: BigInt(user.id),
        tableName: "contractors",
        recordId: contractor.id,
        action: "CREATE",
        newData: contractor,
        reason: "Bulk imported from CSV",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRowError(error, values) });
    }
  }

  revalidatePath("/contractors");
  return { error: null, summary: summarizeImport(results) };
}
