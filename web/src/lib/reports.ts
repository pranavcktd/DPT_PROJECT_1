import "server-only";

/** Indian financial year quarters: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar. */
export const FY_QUARTERS = [
  { value: 1, label: "Q1 (Apr - Jun)" },
  { value: 2, label: "Q2 (Jul - Sep)" },
  { value: 3, label: "Q3 (Oct - Dec)" },
  { value: 4, label: "Q4 (Jan - Mar)" },
] as const;

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

/** The financial year (e.g. "2026-2027") that contains the given calendar date. FY runs Apr 1 - Mar 31. */
export function financialYearOf(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function currentFinancialYear(): string {
  return financialYearOf(new Date());
}

/** A handful of FY options around the current one, for the filter dropdown. */
export function financialYearOptions(spanBack = 3, spanForward = 1): string[] {
  const currentStartYear = Number(currentFinancialYear().split("-")[0]);
  const options: string[] = [];
  for (let y = currentStartYear + spanForward; y >= currentStartYear - spanBack; y--) {
    options.push(`${y}-${y + 1}`);
  }
  return options;
}

/** [start, end) UTC date range for a given FY + quarter (1-4). */
export function quarterDateRange(fy: string, quarter: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const startYear = Number(fy.split("-")[0]);
  // Q1 starts in the FY's start year (April); Q4 starts in the FY's end year (January).
  const quarterStartMonth = [3, 6, 9, 0][quarter - 1]; // 0-indexed month: Apr=3, Jul=6, Oct=9, Jan=0
  const quarterStartYear = quarter === 4 ? startYear + 1 : startYear;
  const start = new Date(Date.UTC(quarterStartYear, quarterStartMonth, 1));
  const end = new Date(Date.UTC(quarterStartYear, quarterStartMonth + 3, 1));
  return { start, end };
}

/** [start, end) UTC date range for a given calendar year + month (1-12). */
export function monthDateRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function csvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(columns: string[], rows: (string | number | null)[][]): string {
  const lines = [columns.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvField).join(","));
  }
  // BOM so Excel opens it as UTF-8 (handles the ₹ symbol and Indian names) rather than guessing the wrong codepage.
  return "﻿" + lines.join("\r\n");
}

export function formatDateForReport(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}
