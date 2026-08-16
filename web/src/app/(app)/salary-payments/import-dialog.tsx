"use client";

import { CsvImportDialog } from "@/components/csv-import-dialog";
import { importSalaryPayments } from "./import-actions";

export function SalaryPaymentsImportDialog() {
  return (
    <CsvImportDialog
      title="Import Salary Payments"
      description="Upload a CSV matching the template below. employee_pan must match an existing employee's PAN exactly - use the Employees page to check or add them first."
      templateHref="/api/salary-payments/import-template"
      action={importSalaryPayments}
    />
  );
}
