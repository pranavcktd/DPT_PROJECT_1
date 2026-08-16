"use client";

import { CsvImportDialog } from "@/components/csv-import-dialog";
import { importSchemes } from "./import-actions";

export function SchemesImportDialog() {
  return (
    <CsvImportDialog
      title="Import Schemes"
      description="Upload a CSV matching the template below. Scheme Name, Financial Year, and Sanctioned Budget are required."
      templateHref="/api/schemes/import-template"
      action={importSchemes}
    />
  );
}
