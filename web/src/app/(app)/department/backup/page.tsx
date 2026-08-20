import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BackupRestoreDialog } from "@/components/backup-restore-dialog";
import { ClearDataDialog } from "@/components/clear-data-dialog";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { restoreOwnDepartmentBackup } from "../backup-actions";
import { clearOwnDepartmentData } from "../danger-zone-actions";

export default async function DepartmentBackupPage() {
  const user = await requireModulePermission("DEPARTMENT_SETTINGS", "view");
  const departmentId = BigInt(user.departmentId);

  const department = await db.departments.findUniqueOrThrow({ where: { id: departmentId } });

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="backup"
        title="Backup & Database"
        description="Export or restore your department's data, and clear dummy/test data when you're ready to go live."
      />
      <Card>
        <CardHeader>
          <CardTitle>Data Backup</CardTitle>
          <CardDescription>
            Download every module&apos;s data as readable Excel sheets, plus a raw SQL file, bundled into one zip - a
            plain-language backup anyone in the department can open and understand, with a database-level format
            alongside it for a technical restore if ever needed. You can restore the zip back later; existing records
            are never overwritten, only new ones added.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <a href="/api/department/backup/export" className={buttonVariants({ variant: "default" })}>
            Download Full Backup (.zip)
          </a>
          <BackupRestoreDialog
            description="Upload a backup .zip previously downloaded from this page. Existing records are kept as-is; only new rows are added, and anything that would collide with an existing record is reported, not overwritten."
            action={restoreOwnDepartmentBackup}
          />
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Clear every contractor, employee, scheme, work order, payment, salary payment, and certificate - useful to
            wipe dummy/test data before entering real records. Your department, staff logins, and settings are kept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClearDataDialog
            tenantCode={department.tenant_code}
            departmentName={department.department_name}
            notifyEmail={department.official_email ?? ""}
            action={clearOwnDepartmentData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
