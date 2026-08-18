import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { formatDateForReport } from "@/lib/reports";
import { NoticeFormDialog } from "./notice-form-dialog";
import { ToggleNoticeActiveButton, DeleteNoticeDialog } from "./notice-row-actions";

export default async function SuperAdminNoticesPage() {
  await requireSuperAdmin();

  const [notices, departments] = await Promise.all([
    db.notices.findMany({
      include: { departments: { select: { department_name: true, tenant_code: true } } },
      orderBy: { created_at: "desc" },
    }),
    db.departments.findMany({ orderBy: { department_name: "asc" }, select: { id: true, department_name: true, tenant_code: true } }),
  ]);

  const departmentOptions = departments.map((d) => ({
    id: d.id.toString(),
    department_name: d.department_name,
    tenant_code: d.tenant_code,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="notices"
        title="Notices"
        description="Announcements shown as a banner on department dashboards, e.g. TDS/GSTR-7 filing deadline reminders."
        action={<NoticeFormDialog departments={departmentOptions} triggerLabel="New Notice" />}
      />

      {notices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notices yet.</p>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id.toString()}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant={n.is_active ? "default" : "secondary"}>{n.is_active ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline">
                      {n.departments ? `${n.departments.department_name} (${n.departments.tenant_code})` : "All Departments"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.starts_at ? `From ${formatDateForReport(n.starts_at)}` : "No start date"}
                    {" · "}
                    {n.expires_at ? `Until ${formatDateForReport(n.expires_at)}` : "No expiry"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <NoticeFormDialog
                    departments={departmentOptions}
                    notice={{
                      id: n.id.toString(),
                      title: n.title,
                      message: n.message,
                      department_id: n.department_id?.toString() ?? "",
                      starts_at: n.starts_at?.toISOString().slice(0, 10) ?? "",
                      expires_at: n.expires_at?.toISOString().slice(0, 10) ?? "",
                    }}
                    triggerLabel="Edit"
                    triggerVariant="outline"
                    triggerSize="sm"
                  />
                  <ToggleNoticeActiveButton noticeId={n.id.toString()} isActive={n.is_active} />
                  <DeleteNoticeDialog noticeId={n.id.toString()} title={n.title} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
