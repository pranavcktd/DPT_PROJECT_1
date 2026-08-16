"use client";

import { CsvImportDialog } from "@/components/csv-import-dialog";
import { importWorks } from "./import-actions";

export function WorksImportDialog() {
  return (
    <CsvImportDialog
      title="Import Work Orders"
      description="Upload a CSV matching the template below. Work Name, Scheme Name, Financial Year, and Sanctioned Cost are required - the scheme must already exist and match by name + financial year exactly."
      templateHref="/api/works/import-template"
      action={importWorks}
    />
  );
}
