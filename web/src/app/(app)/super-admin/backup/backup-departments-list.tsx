"use client";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PaginationBar } from "@/components/pagination-bar";
import { BackupRestoreDialog } from "@/components/backup-restore-dialog";
import { ClearDataDialog } from "@/components/clear-data-dialog";
import { usePagination } from "@/hooks/use-pagination";
import { restoreDepartmentBackupAsSuperAdmin, clearDepartmentDataAsSuperAdmin } from "../departments/backup-actions";

export type BackupDepartmentRow = {
  id: string;
  tenant_code: string;
  department_name: string;
  official_email: string | null;
};

export function BackupDepartmentsList({ departments }: { departments: BackupDepartmentRow[] }) {
  const paged = usePagination(departments, 10);

  if (departments.length === 0) {
    return <p className="text-sm text-muted-foreground">No departments onboarded yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paged.pageItems.map((dept) => (
          <div key={dept.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{dept.department_name}</p>
                  <Badge variant="outline">{dept.tenant_code}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{dept.official_email ?? "No official email on file"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/super-admin/departments/${dept.id}/backup/export`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Export Data
                </a>
                <BackupRestoreDialog
                  triggerLabel="Restore Data"
                  description={`Upload a backup .zip for ${dept.department_name}. Existing records are kept as-is; only new rows are added.`}
                  action={(prev, formData) => restoreDepartmentBackupAsSuperAdmin(dept.id, prev, formData)}
                />
                <ClearDataDialog
                  tenantCode={dept.tenant_code}
                  departmentName={dept.department_name}
                  notifyEmail={dept.official_email ?? ""}
                  action={(confirmTenantCode) => clearDepartmentDataAsSuperAdmin(dept.id, confirmTenantCode)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <PaginationBar
        page={paged.page}
        totalPages={paged.totalPages}
        totalItems={paged.totalItems}
        pageSize={paged.pageSize}
        effectivePageSize={paged.effectivePageSize}
        onPageChange={paged.setPage}
        onPageSizeChange={paged.setPageSize}
      />
    </div>
  );
}
