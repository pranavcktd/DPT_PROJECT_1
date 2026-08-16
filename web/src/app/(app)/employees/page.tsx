import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeesImportDialog } from "./import-dialog";
import { EmployeesTable } from "./employees-table";

export default async function EmployeesPage() {
  const { user, can_create, can_edit } = await getModulePermissions("EMPLOYEE_MASTER");
  const theme = MODULE_THEME.employees;

  const employees = await db.employees.findMany({
    where: { department_id: BigInt(user.departmentId) },
    orderBy: { employee_name: "asc" },
  });

  const rows = employees.map((e) => ({
    id: e.id.toString(),
    employee_name: e.employee_name,
    pan_number: e.pan_number,
    dob: e.dob?.toISOString().slice(0, 10) ?? "",
    mobile: e.mobile ?? "",
    joining_date: e.joining_date?.toISOString().slice(0, 10) ?? "",
    transfer_date: e.transfer_date?.toISOString().slice(0, 10) ?? "",
    status: e.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="employees"
        title="Employee Details"
        description="Departmental staff for salary payments and Form 24Q reporting."
        action={
          can_create ? (
            <div className="flex flex-wrap items-center gap-2">
              <a href="/api/employees/export" className={buttonVariants({ variant: "outline" })}>
                Export
              </a>
              <EmployeesImportDialog />
              <EmployeeFormDialog triggerLabel="New Employee" triggerClassName={theme.button} />
            </div>
          ) : null
        }
      />
      <EmployeesTable employees={rows} can_edit={can_edit} />
    </div>
  );
}
