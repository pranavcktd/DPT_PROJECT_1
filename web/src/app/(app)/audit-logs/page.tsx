import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ReportFilterBar } from "@/components/report-filter-bar";
import { AuditLogTable, type AuditLogRow } from "@/components/audit-log-table";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";

export default async function AuditLogsPage(props: PageProps<"/audit-logs">) {
  const user = await requireModulePermission("AUDIT_LOGS", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const tableFilter = typeof searchParams.table === "string" ? searchParams.table : "";
  const actionFilter = typeof searchParams.action === "string" ? searchParams.action : "";
  const from = typeof searchParams.from === "string" ? searchParams.from : "";
  const to = typeof searchParams.to === "string" ? searchParams.to : "";

  const tableNames = await db.audit_logs.findMany({
    where: { department_id: departmentId },
    distinct: ["table_name"],
    select: { table_name: true },
    orderBy: { table_name: "asc" },
  });

  const logs = await db.audit_logs.findMany({
    where: {
      department_id: departmentId,
      ...(tableFilter ? { table_name: tableFilter } : {}),
      ...(actionFilter ? { action: actionFilter as "CREATE" | "UPDATE" | "DELETE" } : {}),
      ...(from || to
        ? {
            created_at: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    include: { users: { select: { name: true } } },
    orderBy: { created_at: "desc" },
    take: 500,
  });

  const rows: AuditLogRow[] = logs.map((l) => ({
    id: l.id.toString(),
    created_at: l.created_at.toISOString(),
    user_name: l.users?.name ?? null,
    action: l.action,
    table_name: l.table_name,
    record_id: l.record_id.toString(),
    reason: l.reason,
    ip_address: l.ip_address,
    old_data: l.old_data,
    new_data: l.new_data,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="auditLogs"
        title="Audit Logs"
        description="Every create, update, and delete performed in your department, with who did it and when."
      />

      <Card>
        <CardContent className="pt-6">
          <ReportFilterBar
            fields={[
              {
                type: "select",
                name: "table",
                label: "Table",
                defaultValue: "",
                options: [
                  { value: "", label: "All tables" },
                  ...tableNames.map((t) => ({ value: t.table_name, label: t.table_name })),
                ],
              },
              {
                type: "select",
                name: "action",
                label: "Action",
                defaultValue: "",
                options: [
                  { value: "", label: "All actions" },
                  { value: "CREATE", label: "Create" },
                  { value: "UPDATE", label: "Update" },
                  { value: "DELETE", label: "Delete" },
                ],
              },
              { type: "date", name: "from", label: "From" },
              { type: "date", name: "to", label: "To" },
            ]}
          />
        </CardContent>
      </Card>

      <AuditLogTable rows={rows} />
    </div>
  );
}
