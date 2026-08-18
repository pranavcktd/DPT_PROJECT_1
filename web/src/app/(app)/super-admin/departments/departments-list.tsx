"use client";

import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/pagination-bar";
import { usePagination } from "@/hooks/use-pagination";
import { SubscriptionDialog } from "./subscription-dialog";
import { ToggleStatusDialog, ResetPasswordDialog, DeleteDepartmentDialog, FutureDatesToggleDialog } from "./department-row-actions";

export type DepartmentRow = {
  id: string;
  tenant_code: string;
  department_name: string;
  official_email: string | null;
  status: "ACTIVE" | "INACTIVE";
  subscription_amount: number | null;
  subscription_start_date: string | null;
  subscription_days: number | null;
  subscription_end_date: string | null;
  allow_future_payment_dates: boolean;
  user_count: number;
};

function subscriptionLabel(endDateIso: string | null) {
  if (!endDateIso) return { text: "Unmetered", variant: "secondary" as const };
  const endDate = new Date(endDateIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (endDate < today) return { text: `Expired ${endDate.toLocaleDateString("en-IN")}`, variant: "destructive" as const };
  return { text: `Valid till ${endDate.toLocaleDateString("en-IN")}`, variant: "outline" as const };
}

export function DepartmentsList({ departments }: { departments: DepartmentRow[] }) {
  const paged = usePagination(departments, 10);

  if (departments.length === 0) {
    return <p className="text-sm text-muted-foreground">No departments onboarded yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paged.pageItems.map((dept) => {
          const sub = subscriptionLabel(dept.subscription_end_date);
          return (
            <div key={dept.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{dept.department_name}</p>
                    <Badge variant="outline">{dept.tenant_code}</Badge>
                    <Badge variant={dept.status === "ACTIVE" ? "secondary" : "destructive"}>{dept.status}</Badge>
                    <Badge variant={sub.variant}>{sub.text}</Badge>
                    {dept.allow_future_payment_dates ? <Badge variant="outline">Future dates allowed</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{dept.official_email ?? "No official email on file"}</p>
                  <p className="text-xs text-muted-foreground">
                    {dept.user_count} user account{dept.user_count === 1 ? "" : "s"}
                    {dept.subscription_amount !== null ? ` · ₹${dept.subscription_amount.toLocaleString("en-IN")} subscription` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SubscriptionDialog
                    departmentId={dept.id}
                    departmentName={dept.department_name}
                    subscription={{
                      amount: dept.subscription_amount,
                      startDate: dept.subscription_start_date,
                      days: dept.subscription_days,
                    }}
                  />
                  <ResetPasswordDialog departmentId={dept.id} departmentName={dept.department_name} />
                  <FutureDatesToggleDialog
                    departmentId={dept.id}
                    departmentName={dept.department_name}
                    allowFutureDates={dept.allow_future_payment_dates}
                  />
                  <ToggleStatusDialog departmentId={dept.id} departmentName={dept.department_name} status={dept.status} />
                  <DeleteDepartmentDialog departmentId={dept.id} tenantCode={dept.tenant_code} />
                </div>
              </div>
            </div>
          );
        })}
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
