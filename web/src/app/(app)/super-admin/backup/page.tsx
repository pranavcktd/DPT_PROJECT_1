import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { buildDatabaseSizeReport } from "@/lib/db-size";
import { BackupDepartmentsList, type BackupDepartmentRow } from "./backup-departments-list";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex++;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[unitIndex]}`;
}

export default async function SuperAdminBackupPage() {
  await requireSuperAdmin();

  const [report, departments] = await Promise.all([
    buildDatabaseSizeReport(),
    db.departments.findMany({
      orderBy: { department_name: "asc" },
      select: { id: true, tenant_code: true, department_name: true, official_email: true },
    }),
  ]);

  const rows: BackupDepartmentRow[] = departments.map((d) => ({
    id: d.id.toString(),
    tenant_code: d.tenant_code,
    department_name: d.department_name,
    official_email: d.official_email,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="backup"
        title="Backup & Database"
        description="Export/restore any department's data, clear dummy data, and see how much storage your application is using."
        action={
          <a href="/api/super-admin/database/export" className={buttonVariants({ variant: "outline" })}>
            Export Full Database (.sql)
          </a>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Database Size (actual)</p>
          <p className="text-2xl font-semibold">{formatBytes(report.totalDatabaseBytes)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The database&apos;s real on-disk size, including indexes, shared lookup tables, and system overhead - use
            this to size your database subscription/hosting plan.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Sum of Department Estimates</p>
          <p className="text-2xl font-semibold">{formatBytes(report.sumOfDepartmentEstimateBytes)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Won&apos;t exactly match the total above - shared/global tables and overhead aren&apos;t attributed to any
            one department.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Size by Department</CardTitle>
          <CardDescription>
            Postgres tracks storage per table, not per department, since every department shares the same tables -
            these are <strong>estimates</strong>, splitting each table&apos;s real size proportionally by each
            department&apos;s share of its rows. Good enough to guide a subscription/hosting decision, not an exact
            figure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Estimated Size</TableHead>
                <TableHead className="text-right">Share of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No departments onboarded yet.
                  </TableCell>
                </TableRow>
              ) : (
                report.departments.map((d) => (
                  <TableRow key={d.departmentId}>
                    <TableCell className="font-medium">
                      {d.departmentName} <Badge variant="outline">{d.tenantCode}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatBytes(d.estimatedBytes)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {report.sumOfDepartmentEstimateBytes > 0
                        ? `${((d.estimatedBytes / report.sumOfDepartmentEstimateBytes) * 100).toFixed(1)}%`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup &amp; Restore per Department</CardTitle>
          <CardDescription>
            Export a department&apos;s data as an Excel+SQL backup zip, restore one back in (existing records are kept
            as-is, only new rows are added), or clear a department&apos;s dummy/test data - a fresh backup is taken
            automatically first, so a clear is always undoable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BackupDepartmentsList departments={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
