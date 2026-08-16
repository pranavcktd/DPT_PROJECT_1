"use client";

import { CsvImportDialog } from "@/components/csv-import-dialog";
import { importContractors } from "./import-actions";

export function ContractorsImportDialog() {
  return (
    <CsvImportDialog
      title="Import Contractors"
      description="Upload a CSV matching the template below. Firm Name and PAN are required; every other column is optional. Existing contractors (matched by PAN or vendor code) are reported as errors, not overwritten."
      templateHref="/api/contractors/import-template"
      action={importContractors}
    />
  );
}
