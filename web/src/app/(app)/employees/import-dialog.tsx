"use client";

import { CsvImportDialog } from "@/components/csv-import-dialog";
import { importEmployees } from "./import-actions";

export function EmployeesImportDialog() {
  return (
    <CsvImportDialog
      title="Import Employees"
      description="Upload a CSV matching the template below. Employee Name and PAN are required. Existing employees (matched by PAN) are reported as errors, not overwritten."
      templateHref="/api/employees/import-template"
      action={importEmployees}
    />
  );
}
