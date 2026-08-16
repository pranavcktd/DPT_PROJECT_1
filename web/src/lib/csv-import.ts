import "server-only";
import { parse } from "csv-parse/sync";

/** Parses an uploaded CSV file's text into an array of header-keyed row objects. Trims every cell. */
export function parseCsvRows(text: string): Record<string, string>[] {
  const records = parse(text, {
    columns: (headerRow: string[]) => headerRow.map((h) => h.trim()),
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];
  return records;
}

export type ImportRowResult = { row: number; error: string } | { row: number; success: true };

export type ImportSummary = {
  totalRows: number;
  created: number;
  failed: { row: number; error: string }[];
};

export function summarizeImport(results: ImportRowResult[]): ImportSummary {
  const failed = results.filter((r): r is { row: number; error: string } => "error" in r);
  return {
    totalRows: results.length,
    created: results.length - failed.length,
    failed,
  };
}
