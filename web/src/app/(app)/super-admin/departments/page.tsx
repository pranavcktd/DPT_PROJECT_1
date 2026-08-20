import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { DepartmentFormDialog } from "./department-form-dialog";
import { DepartmentsList, type DepartmentRow } from "./departments-list";

export default async function SuperAdminDepartmentsPage() {
  await requireSuperAdmin();

  const departments = await db.departments.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      tenant_code: true,
      department_name: true,
      office_address: true,
      district: true,
      state: true,
      gstin: true,
      gstin_registration_date: true,
      pan: true,
      tan: true,
      official_email: true,
      contact_number: true,
      status: true,
      subscription_amount: true,
      subscription_start_date: true,
      subscription_days: true,
      subscription_end_date: true,
      allow_future_payment_dates: true,
      _count: { select: { users_users_department_idTodepartments: true } },
    },
  });

  const rows: DepartmentRow[] = departments.map((dept) => ({
    id: dept.id.toString(),
    tenant_code: dept.tenant_code,
    department_name: dept.department_name,
    office_address: dept.office_address,
    district: dept.district,
    state: dept.state,
    gstin: dept.gstin,
    gstin_registration_date: dept.gstin_registration_date ? dept.gstin_registration_date.toISOString() : null,
    pan: dept.pan,
    tan: dept.tan,
    official_email: dept.official_email,
    contact_number: dept.contact_number,
    status: dept.status,
    subscription_amount: dept.subscription_amount !== null ? Number(dept.subscription_amount) : null,
    subscription_start_date: dept.subscription_start_date ? dept.subscription_start_date.toISOString() : null,
    subscription_days: dept.subscription_days,
    subscription_end_date: dept.subscription_end_date ? dept.subscription_end_date.toISOString() : null,
    allow_future_payment_dates: dept.allow_future_payment_dates,
    user_count: dept._count.users_users_department_idTodepartments,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="superAdmin"
        title="Departments"
        description="Onboard departments and manage their access, subscriptions, and admin credentials. Backup, restore, and database size have moved to Backup & Database."
        action={<DepartmentFormDialog />}
      />
      <DepartmentsList departments={rows} />
    </div>
  );
}
