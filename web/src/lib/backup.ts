import "server-only";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import AdmZip from "adm-zip";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { calculatePayment, deriveGstTdsType } from "@/lib/payment-calc";
import { DEFAULT_PASSWORD } from "@/lib/auth-constants";
import { formatDateForReport } from "@/lib/reports";
import type { ImportSummary, ImportRowResult } from "@/lib/csv-import";
import { summarizeImport } from "@/lib/csv-import";

type CellValue = string | number | boolean | null;

/** One sheet in the backup zip: a fixed header row plus one row per record. */
type ExportSheet = {
  label: string;
  columns: string[];
  rows(departmentId: bigint): Promise<CellValue[][]>;
};

const EXPORT_SHEETS: ExportSheet[] = [
  {
    label: "DepartmentProfile",
    columns: [
      "department_name",
      "office_address",
      "district",
      "state",
      "gstin",
      "gstin_registration_date",
      "pan",
      "tan",
      "official_email",
      "contact_number",
    ],
    async rows(departmentId) {
      const d = await db.departments.findUniqueOrThrow({ where: { id: departmentId } });
      return [
        [
          d.department_name,
          d.office_address,
          d.district,
          d.state,
          d.gstin,
          formatDateForReport(d.gstin_registration_date),
          d.pan,
          d.tan,
          d.official_email,
          d.contact_number,
        ],
      ];
    },
  },
  {
    label: "Contractors",
    columns: [
      "firm_name",
      "vendor_code",
      "pan_number",
      "gstin",
      "address",
      "district",
      "state",
      "pin_code",
      "contact_person",
      "phone",
      "email",
      "bank_name",
      "bank_branch",
      "account_number",
      "ifsc_code",
      "account_holder_name",
      "status",
    ],
    async rows(departmentId) {
      const contractors = await db.contractors.findMany({ where: { department_id: departmentId }, orderBy: { firm_name: "asc" } });
      return contractors.map((c) => [
        c.firm_name,
        c.vendor_code,
        c.pan_number,
        c.gstin,
        c.address,
        c.district,
        c.state,
        c.pin_code,
        c.contact_person,
        c.phone,
        c.email,
        c.bank_name,
        c.bank_branch,
        c.account_number,
        c.ifsc_code,
        c.account_holder_name,
        c.status,
      ]);
    },
  },
  {
    label: "Employees",
    columns: ["employee_name", "pan_number", "email", "designation", "employee_code", "dob", "mobile", "joining_date", "transfer_date", "status"],
    async rows(departmentId) {
      const employees = await db.employees.findMany({ where: { department_id: departmentId }, orderBy: { employee_name: "asc" } });
      return employees.map((e) => [
        e.employee_name,
        e.pan_number,
        e.email,
        e.designation,
        e.employee_code,
        formatDateForReport(e.dob),
        e.mobile,
        formatDateForReport(e.joining_date),
        formatDateForReport(e.transfer_date),
        e.status,
      ]);
    },
  },
  {
    label: "Schemes",
    columns: ["scheme_name", "financial_year", "sanctioned_budget", "description", "status"],
    async rows(departmentId) {
      const schemes = await db.schemes.findMany({ where: { department_id: departmentId }, orderBy: { scheme_name: "asc" } });
      return schemes.map((s) => [s.scheme_name, s.financial_year, Number(s.sanctioned_budget), s.description, s.status]);
    },
  },
  {
    label: "Works",
    columns: ["work_name", "scheme_name", "sanctioned_cost", "expected_completion_date", "actual_completion_date", "status"],
    async rows(departmentId) {
      const works = await db.works.findMany({
        where: { department_id: departmentId },
        include: { schemes: { select: { scheme_name: true } } },
        orderBy: { work_name: "asc" },
      });
      return works.map((w) => [
        w.work_name,
        w.schemes.scheme_name,
        Number(w.sanctioned_cost),
        formatDateForReport(w.expected_completion_date),
        formatDateForReport(w.actual_completion_date),
        w.status,
      ]);
    },
  },
  {
    label: "Payments",
    columns: [
      "work_name",
      "contractor_pan",
      "agreement_number",
      "agreement_date",
      "invoice_number",
      "invoice_date",
      "base_cost",
      "gst_rate",
      "it_tds_rate",
      "gst_tds_rate",
      "labour_cess_rate",
      "royalty_type",
      "royalty_value",
      "stamp_duty_type",
      "stamp_duty_value",
      "other_deduction_type",
      "other_deduction_value",
      "other_deduction_remarks",
      "pay_mode",
      "treasury_token_number",
      "token_generated_date",
      "actual_payment_date",
      "remarks",
      "status",
    ],
    async rows(departmentId) {
      const payments = await db.payments.findMany({ where: { department_id: departmentId }, orderBy: { created_at: "asc" } });
      return payments.map((p) => [
        p.work_name_snapshot,
        p.contractor_pan_snapshot,
        p.agreement_number_snapshot,
        formatDateForReport(p.agreement_date_snapshot),
        p.invoice_number,
        formatDateForReport(p.invoice_date),
        Number(p.base_cost),
        Number(p.gst_rate),
        Number(p.it_tds_rate),
        Number(p.gst_tds_rate),
        Number(p.labour_cess_rate),
        p.royalty_type,
        Number(p.royalty_value),
        p.stamp_duty_type,
        Number(p.stamp_duty_value),
        p.other_deduction_type,
        Number(p.other_deduction_value),
        p.other_deduction_remarks,
        p.pay_mode,
        p.treasury_token_number,
        formatDateForReport(p.token_generated_date),
        formatDateForReport(p.actual_payment_date),
        p.remarks,
        p.status,
      ]);
    },
  },
  {
    label: "SalaryPayments",
    columns: [
      "employee_pan",
      "payment_period_month",
      "payment_period_year",
      "payment_type",
      "other_type_label",
      "gross_salary",
      "it_deduction_amount",
      "pay_mode",
      "treasury_token_number",
      "token_generated_date",
      "actual_payment_date",
      "remarks",
      "status",
    ],
    async rows(departmentId) {
      const rows = await db.salary_payments.findMany({ where: { department_id: departmentId }, orderBy: { created_at: "asc" } });
      return rows.map((p) => [
        p.employee_pan_snapshot,
        p.payment_period_month,
        p.payment_period_year,
        p.payment_type,
        p.other_type_label,
        Number(p.gross_salary),
        Number(p.it_deduction_amount),
        p.pay_mode,
        p.treasury_token_number,
        formatDateForReport(p.token_generated_date),
        formatDateForReport(p.actual_payment_date),
        p.remarks,
        p.status,
      ]);
    },
  },
  {
    label: "Certificates",
    columns: [
      "certificate_number",
      "work_name",
      "contractor_pan",
      "stated_completion_date",
      "actual_completion_date",
      "sanctioned_value",
      "executed_value",
      "performance_rating_label",
      "performance_rating_score",
      "remarks",
      "issued_at",
    ],
    async rows(departmentId) {
      const certs = await db.work_experience_certificates.findMany({
        where: { department_id: departmentId },
        include: { works: { select: { work_name: true } }, contractors: { select: { pan_number: true } } },
        orderBy: { issued_at: "asc" },
      });
      return certs.map((c) => [
        c.certificate_number,
        c.works.work_name,
        c.contractors.pan_number,
        formatDateForReport(c.stated_completion_date),
        formatDateForReport(c.actual_completion_date),
        Number(c.sanctioned_value),
        Number(c.executed_value),
        c.performance_rating_label,
        c.performance_rating_score !== null ? Number(c.performance_rating_score) : null,
        c.remarks,
        formatDateForReport(c.issued_at),
      ]);
    },
  },
  {
    label: "Staff",
    columns: ["name", "email", "phone", "role", "status"],
    async rows(departmentId) {
      const users = await db.users.findMany({
        where: { department_id: departmentId },
        include: { roles: { select: { role_name: true } } },
        orderBy: { name: "asc" },
      });
      return users.map((u) => [u.name, u.email, u.phone, u.roles.role_name, u.status]);
    },
  },
];

/** Builds the full backup zip - one real .xlsx per module, plus a raw SQL dump, bundled together. */
export async function buildDepartmentBackupZip(departmentId: bigint): Promise<Buffer> {
  const zip = new AdmZip();

  for (const sheet of EXPORT_SHEETS) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheet.label);
    worksheet.addRow(sheet.columns);
    const rows = await sheet.rows(departmentId);
    for (const row of rows) worksheet.addRow(row);
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    zip.addFile(`${sheet.label}.xlsx`, Buffer.from(buffer));
  }

  const sql = await buildDepartmentDataSql(departmentId);
  zip.addFile("DatabaseBackup.sql", Buffer.from(sql, "utf-8"));

  return zip.toBuffer();
}

// ---------------------------------------------------------------------------
// Raw SQL dump (a database-level backup format alongside the Excel sheets)

/** Module tables covered by the SQL dump - same scope as the Excel sheets
 * above, minus Staff/DepartmentProfile (see buildDepartmentDataSql). */
const SQL_BACKUP_TABLES = [
  "contractors",
  "employees",
  "schemes",
  "works",
  "payments",
  "salary_payments",
  "work_experience_certificates",
  "certificate_logs",
];

/** Columns Postgres computes itself (STORED GENERATED) can't appear in an
 * INSERT column list - read from information_schema instead of hand-copying
 * the schema.sql column list, so this never drifts out of sync with it. */
async function nonGeneratedColumns(tableName: string): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'NEVER'
     ORDER BY ordinal_position`,
    tableName,
  );
  return rows.map((r) => r.column_name);
}

/** Quoted SQL literal for any column value - always quotes (even numbers and
 * booleans work fine quoted; Postgres casts the literal to the destination
 * column's real type), which keeps this one branch instead of needing to
 * track each column's SQL type separately. */
function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * A raw SQL INSERT-statement dump of this department's module data - the
 * same tables as the Excel sheets, minus Staff (avoids ever writing a
 * password hash into a plain-text file that gets emailed) and
 * DepartmentProfile (the department row itself is never deleted, so there's
 * nothing to restore there). Restorable directly via `psql <connection> -f
 * file.sql` - ids and foreign keys are preserved as-is, so this is meant to
 * be restored back into the exact same department it came from (e.g. undoing
 * an accidental Clear All Data), not into a different one - the Excel+zip
 * restore flow already handles cross-department restores by matching on
 * names/PANs instead of raw ids.
 */
export async function buildDepartmentDataSql(departmentId: bigint): Promise<string> {
  const lines: string[] = [
    "-- Raw SQL backup - module data only.",
    "-- Restore with: psql <connection-string> -f this-file.sql",
    "-- Restores into the SAME department/table ids this was exported from.",
    "BEGIN;",
    "",
  ];

  for (const table of SQL_BACKUP_TABLES) {
    const columns = await nonGeneratedColumns(table);
    const quotedColumns = columns.map((c) => `"${c}"`).join(", ");
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${quotedColumns} FROM "${table}" WHERE department_id = $1::bigint ORDER BY id`,
      departmentId.toString(),
    );
    if (rows.length === 0) continue;

    lines.push(`-- ${table} (${rows.length} row${rows.length === 1 ? "" : "s"})`);
    for (const row of rows) {
      const values = columns.map((c) => sqlLiteral(row[c])).join(", ");
      lines.push(`INSERT INTO "${table}" (${quotedColumns}) OVERRIDING SYSTEM VALUE VALUES (${values});`);
    }
    lines.push(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM "${table}"));`, "");
  }

  lines.push("COMMIT;");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Restore

function n(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
function toNullable(value: string): string | null {
  return value.length > 0 ? value : null;
}
function toNullableDate(value: string): Date | null {
  return value.length > 0 ? new Date(value) : null;
}

/** Reads every worksheet row (after the header) as a plain string-keyed record, matching parseCsvRows' shape. */
async function readSheetRows(buffer: Buffer, sheetName: string): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, string>[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;
    const record: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, i) => {
      if (!header) return;
      const cell = row.getCell(i + 1);
      const value = cell.value;
      let str = "";
      if (value instanceof Date) str = value.toISOString().slice(0, 10);
      else if (value !== null && value !== undefined) str = String(value);
      record[header] = str.trim();
      if (record[header]) hasValue = true;
    });
    if (hasValue) rows.push(record);
  }
  return rows;
}

type RestoreContext = { departmentId: bigint; userId: bigint };

async function restoreContractors(zip: AdmZip, ctx: RestoreContext): Promise<ImportSummary | null> {
  const entry = zip.getEntry("Contractors.xlsx");
  if (!entry) return null;
  const rows = await readSheetRows(entry.getData(), "Contractors");
  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2;
    if (!r.firm_name || !r.pan_number) {
      results.push({ row: rowNumber, error: "firm_name and pan_number are required" });
      continue;
    }
    try {
      const contractor = await db.contractors.create({
        data: {
          department_id: ctx.departmentId,
          firm_name: r.firm_name,
          vendor_code: toNullable(r.vendor_code),
          pan_number: r.pan_number.toUpperCase(),
          gstin: toNullable(r.gstin?.toUpperCase() ?? ""),
          address: toNullable(r.address),
          district: toNullable(r.district),
          state: toNullable(r.state),
          pin_code: toNullable(r.pin_code),
          contact_person: toNullable(r.contact_person),
          phone: toNullable(r.phone),
          email: toNullable(r.email),
          bank_name: toNullable(r.bank_name),
          bank_branch: toNullable(r.bank_branch),
          account_number: toNullable(r.account_number),
          ifsc_code: toNullable(r.ifsc_code?.toUpperCase() ?? ""),
          account_holder_name: toNullable(r.account_holder_name),
          status: (r.status as "ACTIVE" | "INACTIVE" | "BLACKLISTED") || "ACTIVE",
          created_by: ctx.userId,
        },
      });
      await writeAuditLog({
        departmentId: ctx.departmentId,
        performedBy: ctx.userId,
        tableName: "contractors",
        recordId: contractor.id,
        action: "CREATE",
        newData: contractor,
        reason: "Restored from backup",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRestoreError(error) });
    }
  }
  return summarizeImport(results);
}

async function restoreEmployees(zip: AdmZip, ctx: RestoreContext): Promise<ImportSummary | null> {
  const entry = zip.getEntry("Employees.xlsx");
  if (!entry) return null;
  const rows = await readSheetRows(entry.getData(), "Employees");
  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2;
    if (!r.employee_name || !r.pan_number) {
      results.push({ row: rowNumber, error: "employee_name and pan_number are required" });
      continue;
    }
    try {
      const employee = await db.employees.create({
        data: {
          department_id: ctx.departmentId,
          employee_name: r.employee_name,
          pan_number: r.pan_number.toUpperCase(),
          email: toNullable(r.email),
          designation: toNullable(r.designation),
          employee_code: toNullable(r.employee_code),
          dob: toNullableDate(r.dob),
          mobile: toNullable(r.mobile),
          joining_date: toNullableDate(r.joining_date),
          transfer_date: toNullableDate(r.transfer_date),
          status: (r.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
          created_by: ctx.userId,
        },
      });
      await writeAuditLog({
        departmentId: ctx.departmentId,
        performedBy: ctx.userId,
        tableName: "employees",
        recordId: employee.id,
        action: "CREATE",
        newData: employee,
        reason: "Restored from backup",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRestoreError(error) });
    }
  }
  return summarizeImport(results);
}

async function restoreSchemes(zip: AdmZip, ctx: RestoreContext): Promise<ImportSummary | null> {
  const entry = zip.getEntry("Schemes.xlsx");
  if (!entry) return null;
  const rows = await readSheetRows(entry.getData(), "Schemes");
  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2;
    if (!r.scheme_name || !r.financial_year || !r.sanctioned_budget) {
      results.push({ row: rowNumber, error: "scheme_name, financial_year and sanctioned_budget are required" });
      continue;
    }
    try {
      const scheme = await db.schemes.create({
        data: {
          department_id: ctx.departmentId,
          scheme_name: r.scheme_name,
          financial_year: r.financial_year,
          sanctioned_budget: n(r.sanctioned_budget),
          description: toNullable(r.description),
          status: (r.status as "ACTIVE" | "CLOSED") || "ACTIVE",
          created_by: ctx.userId,
        },
      });
      await writeAuditLog({
        departmentId: ctx.departmentId,
        performedBy: ctx.userId,
        tableName: "schemes",
        recordId: scheme.id,
        action: "CREATE",
        newData: scheme,
        reason: "Restored from backup",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRestoreError(error) });
    }
  }
  return summarizeImport(results);
}

async function restoreWorks(zip: AdmZip, ctx: RestoreContext): Promise<ImportSummary | null> {
  const entry = zip.getEntry("Works.xlsx");
  if (!entry) return null;
  const rows = await readSheetRows(entry.getData(), "Works");
  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2;
    if (!r.work_name || !r.scheme_name || !r.sanctioned_cost) {
      results.push({ row: rowNumber, error: "work_name, scheme_name and sanctioned_cost are required" });
      continue;
    }
    const scheme = await db.schemes.findFirst({ where: { department_id: ctx.departmentId, scheme_name: r.scheme_name } });
    if (!scheme) {
      results.push({ row: rowNumber, error: `No scheme named "${r.scheme_name}" found - restore Schemes first.` });
      continue;
    }
    try {
      const work = await db.works.create({
        data: {
          department_id: ctx.departmentId,
          scheme_id: scheme.id,
          work_name: r.work_name,
          sanctioned_cost: n(r.sanctioned_cost),
          expected_completion_date: toNullableDate(r.expected_completion_date),
          actual_completion_date: toNullableDate(r.actual_completion_date),
          status: (r.status as "ONGOING" | "COMPLETED" | "TERMINATED") || "ONGOING",
          created_by: ctx.userId,
        },
      });
      await writeAuditLog({
        departmentId: ctx.departmentId,
        performedBy: ctx.userId,
        tableName: "works",
        recordId: work.id,
        action: "CREATE",
        newData: work,
        reason: "Restored from backup",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRestoreError(error) });
    }
  }
  return summarizeImport(results);
}

async function restorePayments(zip: AdmZip, ctx: RestoreContext): Promise<ImportSummary | null> {
  const entry = zip.getEntry("Payments.xlsx");
  if (!entry) return null;
  const rows = await readSheetRows(entry.getData(), "Payments");
  const results: ImportRowResult[] = [];
  const department = await db.departments.findUniqueOrThrow({ where: { id: ctx.departmentId } });

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2;
    if (!r.work_name || !r.contractor_pan || !r.invoice_number || !r.invoice_date || !r.base_cost) {
      results.push({ row: rowNumber, error: "work_name, contractor_pan, invoice_number, invoice_date and base_cost are required" });
      continue;
    }
    const work = await db.works.findFirst({ where: { department_id: ctx.departmentId, work_name: r.work_name } });
    const contractor = await db.contractors.findFirst({ where: { department_id: ctx.departmentId, pan_number: r.contractor_pan.toUpperCase() } });
    if (!work) {
      results.push({ row: rowNumber, error: `No work order named "${r.work_name}" found - restore Works first.` });
      continue;
    }
    if (!contractor) {
      results.push({ row: rowNumber, error: `No contractor with PAN "${r.contractor_pan}" found - restore Contractors first.` });
      continue;
    }

    const gstTdsType = deriveGstTdsType(department.state_code, contractor.gst_state_code);
    const calc = calculatePayment({
      baseCost: n(r.base_cost),
      gstRate: n(r.gst_rate),
      itTdsRate: n(r.it_tds_rate),
      gstTdsRate: n(r.gst_tds_rate),
      gstTdsType,
      labourCessRate: n(r.labour_cess_rate),
      royaltyType: (r.royalty_type as "PERCENTAGE" | "FIXED_AMOUNT" | "NOT_APPLICABLE") || "NOT_APPLICABLE",
      royaltyValue: n(r.royalty_value),
      stampDutyType: (r.stamp_duty_type as "PERCENTAGE" | "FIXED_AMOUNT" | "NOT_APPLICABLE") || "NOT_APPLICABLE",
      stampDutyValue: n(r.stamp_duty_value),
      otherDeductionType: (r.other_deduction_type as "PERCENTAGE" | "FIXED_AMOUNT" | "NOT_APPLICABLE") || "NOT_APPLICABLE",
      otherDeductionValue: n(r.other_deduction_value),
    });

    const payMode = (r.pay_mode as "TREASURY" | "OTHER_THAN_TREASURY") || "TREASURY";

    try {
      const payment = await db.payments.create({
        data: {
          department_id: ctx.departmentId,
          work_id: work.id,
          contractor_id: contractor.id,
          contractor_name_snapshot: contractor.firm_name,
          contractor_gstin_snapshot: contractor.gstin,
          contractor_pan_snapshot: contractor.pan_number,
          work_name_snapshot: work.work_name,
          agreement_number_snapshot: r.agreement_number || "N/A",
          agreement_date_snapshot: toNullableDate(r.agreement_date) ?? new Date(r.invoice_date),
          invoice_number: r.invoice_number,
          invoice_date: new Date(r.invoice_date),
          base_cost: n(r.base_cost),
          gst_rate: n(r.gst_rate),
          gst_rate_is_manual: true,
          total_bill_value: calc.totalBillValue,
          it_tds_rate: n(r.it_tds_rate),
          it_tds_rate_is_manual: true,
          gst_tds_rate: n(r.gst_tds_rate),
          gst_tds_rate_is_manual: true,
          gst_tds_type: gstTdsType,
          labour_cess_rate: n(r.labour_cess_rate),
          labour_cess_rate_is_manual: true,
          royalty_type: (r.royalty_type as "PERCENTAGE" | "FIXED_AMOUNT" | "NOT_APPLICABLE") || "NOT_APPLICABLE",
          royalty_value: n(r.royalty_value),
          stamp_duty_type: (r.stamp_duty_type as "PERCENTAGE" | "FIXED_AMOUNT" | "NOT_APPLICABLE") || "NOT_APPLICABLE",
          stamp_duty_value: n(r.stamp_duty_value),
          other_deduction_type: (r.other_deduction_type as "PERCENTAGE" | "FIXED_AMOUNT" | "NOT_APPLICABLE") || "NOT_APPLICABLE",
          other_deduction_value: n(r.other_deduction_value),
          other_deduction_remarks: toNullable(r.other_deduction_remarks),
          total_deductions: calc.totalDeductions,
          net_payable_amount: calc.netPayableAmount,
          pay_mode: payMode,
          treasury_token_number: payMode === "TREASURY" ? toNullable(r.treasury_token_number) : null,
          token_generated_date: payMode === "TREASURY" ? toNullableDate(r.token_generated_date) : null,
          actual_payment_date: toNullableDate(r.actual_payment_date),
          remarks: toNullable(r.remarks),
          status: (r.status as "SAVED" | "APPROVED" | "CANCELLED") || "SAVED",
          created_by: ctx.userId,
        },
      });
      await writeAuditLog({
        departmentId: ctx.departmentId,
        performedBy: ctx.userId,
        tableName: "payments",
        recordId: payment.id,
        action: "CREATE",
        newData: payment,
        reason: "Restored from backup",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRestoreError(error) });
    }
  }
  return summarizeImport(results);
}

async function restoreSalaryPayments(zip: AdmZip, ctx: RestoreContext): Promise<ImportSummary | null> {
  const entry = zip.getEntry("SalaryPayments.xlsx");
  if (!entry) return null;
  const rows = await readSheetRows(entry.getData(), "SalaryPayments");
  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2;
    if (!r.employee_pan || !r.gross_salary || !r.payment_period_month || !r.payment_period_year) {
      results.push({ row: rowNumber, error: "employee_pan, payment_period_month, payment_period_year and gross_salary are required" });
      continue;
    }
    const employee = await db.employees.findFirst({ where: { department_id: ctx.departmentId, pan_number: r.employee_pan.toUpperCase() } });
    if (!employee) {
      results.push({ row: rowNumber, error: `No employee with PAN "${r.employee_pan}" found - restore Employees first.` });
      continue;
    }
    const payMode = (r.pay_mode as "TREASURY" | "OTHER_THAN_TREASURY") || "TREASURY";

    try {
      const payment = await db.salary_payments.create({
        data: {
          department_id: ctx.departmentId,
          employee_id: employee.id,
          employee_name_snapshot: employee.employee_name,
          employee_pan_snapshot: employee.pan_number,
          payment_period_month: Math.min(12, Math.max(1, Math.round(n(r.payment_period_month)))),
          payment_period_year: Math.round(n(r.payment_period_year)),
          payment_type:
            (r.payment_type as "SALARY" | "DA" | "ARREAR" | "MEDICAL_REIMBURSEMENT" | "SALARY_ARREAR" | "DA_ARREAR" | "OTHER") || "SALARY",
          other_type_label: toNullable(r.other_type_label),
          gross_salary: n(r.gross_salary),
          it_deduction_amount: n(r.it_deduction_amount),
          pay_mode: payMode,
          treasury_token_number: payMode === "TREASURY" ? toNullable(r.treasury_token_number) : null,
          token_generated_date: payMode === "TREASURY" ? toNullableDate(r.token_generated_date) : null,
          actual_payment_date: toNullableDate(r.actual_payment_date),
          remarks: toNullable(r.remarks),
          status: (r.status as "SAVED" | "APPROVED" | "CANCELLED") || "SAVED",
          created_by: ctx.userId,
        },
      });
      await writeAuditLog({
        departmentId: ctx.departmentId,
        performedBy: ctx.userId,
        tableName: "salary_payments",
        recordId: payment.id,
        action: "CREATE",
        newData: payment,
        reason: "Restored from backup",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRestoreError(error) });
    }
  }
  return summarizeImport(results);
}

async function restoreStaff(zip: AdmZip, ctx: RestoreContext): Promise<ImportSummary | null> {
  const entry = zip.getEntry("Staff.xlsx");
  if (!entry) return null;
  const rows = await readSheetRows(entry.getData(), "Staff");
  const results: ImportRowResult[] = [];
  const roles = await db.roles.findMany();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2;
    if (!r.name || !r.email || !r.role) {
      results.push({ row: rowNumber, error: "name, email and role are required" });
      continue;
    }
    const existing = await db.users.findUnique({ where: { email: r.email.toLowerCase() } });
    if (existing) {
      results.push({ row: rowNumber, error: `A user with email "${r.email}" already exists - skipped.` });
      continue;
    }
    const role = roles.find((role) => role.role_name === r.role);
    if (!role) {
      results.push({ row: rowNumber, error: `Unknown role "${r.role}".` });
      continue;
    }
    try {
      const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      const user = await db.users.create({
        data: {
          department_id: ctx.departmentId,
          role_id: role.id,
          name: r.name,
          email: r.email.toLowerCase(),
          phone: toNullable(r.phone),
          password_hash,
          must_change_password: true,
          status: (r.status as "ACTIVE" | "INACTIVE" | "SUSPENDED") || "ACTIVE",
          created_by: ctx.userId,
        },
      });
      await writeAuditLog({
        departmentId: ctx.departmentId,
        performedBy: ctx.userId,
        tableName: "users",
        recordId: user.id,
        action: "CREATE",
        newData: user,
        reason: "Restored from backup (default password, must change on first login)",
      });
      results.push({ row: rowNumber, success: true });
    } catch (error) {
      results.push({ row: rowNumber, error: friendlyRestoreError(error) });
    }
  }
  return summarizeImport(results);
}

async function restoreDepartmentProfile(zip: AdmZip, ctx: RestoreContext): Promise<ImportSummary | null> {
  const entry = zip.getEntry("DepartmentProfile.xlsx");
  if (!entry) return null;
  const rows = await readSheetRows(entry.getData(), "DepartmentProfile");
  if (rows.length === 0) return null;
  const r = rows[0];

  try {
    const existing = await db.departments.findUniqueOrThrow({ where: { id: ctx.departmentId } });
    const updated = await db.departments.update({
      where: { id: ctx.departmentId },
      data: {
        office_address: toNullable(r.office_address ?? ""),
        district: toNullable(r.district ?? ""),
        state: toNullable(r.state ?? ""),
        gstin_registration_date: toNullableDate(r.gstin_registration_date ?? ""),
        tan: toNullable(r.tan ?? ""),
        contact_number: toNullable(r.contact_number ?? ""),
      },
    });
    await writeAuditLog({
      departmentId: ctx.departmentId,
      performedBy: ctx.userId,
      tableName: "departments",
      recordId: ctx.departmentId,
      action: "UPDATE",
      oldData: existing,
      newData: updated,
      reason: "Department profile fields restored from backup",
    });
    return { totalRows: 1, created: 1, failed: [] };
  } catch (error) {
    return { totalRows: 1, created: 0, failed: [{ row: 2, error: friendlyRestoreError(error) }] };
  }
}

function friendlyRestoreError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Duplicate value - a matching record already exists, skipped.";
  }
  return error instanceof Error ? error.message : "Unknown error";
}

/**
 * Restores a backup zip into a department. Insert-only - never deletes or
 * overwrites existing rows; a row that collides with an existing unique
 * constraint is reported as a failed/skipped row. Order matters: sheets with
 * no dependencies first, then sheets that reference them by name/PAN (not by
 * the old numeric id, so this works whether restoring into the same
 * department or a different one). Certificates are export-only (not restored).
 */
export async function restoreDepartmentBackupZip(
  zipBuffer: Buffer,
  departmentId: bigint,
  userId: bigint,
): Promise<Record<string, ImportSummary>> {
  const zip = new AdmZip(zipBuffer);
  const ctx: RestoreContext = { departmentId, userId };
  const summary: Record<string, ImportSummary> = {};

  const steps: [string, (zip: AdmZip, ctx: RestoreContext) => Promise<ImportSummary | null>][] = [
    ["DepartmentProfile", restoreDepartmentProfile],
    ["Contractors", restoreContractors],
    ["Employees", restoreEmployees],
    ["Schemes", restoreSchemes],
    ["Works", restoreWorks],
    ["Payments", restorePayments],
    ["SalaryPayments", restoreSalaryPayments],
    ["Staff", restoreStaff],
  ];

  for (const [label, fn] of steps) {
    const result = await fn(zip, ctx);
    if (result) summary[label] = result;
  }

  return summary;
}
