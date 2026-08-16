"use client";

import { CsvImportDialog } from "@/components/csv-import-dialog";
import { importPayments } from "./import-actions";

export function PaymentsImportDialog() {
  return (
    <CsvImportDialog
      title="Import Non-Salary Payments"
      description="Upload a CSV matching the template below. work_name must match an existing work order exactly (uniquely), and contractor_pan must match an existing contractor's PAN. GST TDS type (intra/inter-state) is always derived automatically from department vs. contractor state - it is not read from the file."
      templateHref="/api/payments/import-template"
      action={importPayments}
    />
  );
}
