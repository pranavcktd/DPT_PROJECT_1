import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { DepartmentFormDialog } from "./department-form-dialog";
import { SubscriptionDialog } from "./subscription-dialog";
import { ToggleStatusDialog, ResetPasswordDialog, DeleteDepartmentDialog } from "./department-row-actions";

function subscriptionLabel(endDate: Date | null) {
  if (!endDate) return { text: "Unmetered", variant: "secondary" as const };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (endDate < today) return { text: `Expired ${endDate.toLocaleDateString("en-IN")}`, variant: "destructive" as const };
  return { text: `Valid till ${endDate.toLocaleDateString("en-IN")}`, variant: "outline" as const };
}

export default async function SuperAdminDepartmentsPage() {
  await requireSuperAdmin();

  const departments = await db.departments.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      tenant_code: true,
      department_name: true,
      official_email: true,
      status: true,
      subscription_amount: true,
      subscription_start_date: true,
      subscription_days: true,
      subscription_end_date: true,
      _count: { select: { users_users_department_idTodepartments: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="superAdmin"
        title="Departments"
        description="Onboard departments and manage their access, subscriptions, and admin credentials."
        action={<DepartmentFormDialog />}
      />

      {departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No departments onboarded yet.</p>
      ) : (
        <div className="space-y-3">
          {departments.map((dept) => {
            const sub = subscriptionLabel(dept.subscription_end_date);
            return (
              <div key={dept.id.toString()} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{dept.department_name}</p>
                      <Badge variant="outline">{dept.tenant_code}</Badge>
                      <Badge variant={dept.status === "ACTIVE" ? "secondary" : "destructive"}>{dept.status}</Badge>
                      <Badge variant={sub.variant}>{sub.text}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{dept.official_email ?? "No official email on file"}</p>
                    <p className="text-xs text-muted-foreground">
                      {dept._count.users_users_department_idTodepartments} user account
                      {dept._count.users_users_department_idTodepartments === 1 ? "" : "s"}
                      {dept.subscription_amount !== null ? ` · ₹${Number(dept.subscription_amount).toLocaleString("en-IN")} subscription` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SubscriptionDialog
                      departmentId={dept.id.toString()}
                      departmentName={dept.department_name}
                      subscription={{
                        amount: dept.subscription_amount !== null ? Number(dept.subscription_amount) : null,
                        startDate: dept.subscription_start_date ? dept.subscription_start_date.toISOString() : null,
                        days: dept.subscription_days,
                      }}
                    />
                    <ResetPasswordDialog departmentId={dept.id.toString()} departmentName={dept.department_name} />
                    <ToggleStatusDialog
                      departmentId={dept.id.toString()}
                      departmentName={dept.department_name}
                      status={dept.status}
                    />
                    <DeleteDepartmentDialog departmentId={dept.id.toString()} tenantCode={dept.tenant_code} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
