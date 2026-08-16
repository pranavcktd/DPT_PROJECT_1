import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ReportFilterBar } from "@/components/report-filter-bar";
import { getModulePermissions, ForbiddenError } from "@/lib/session";
import { getReconciliationRows } from "./data";
import { ReconciliationTable } from "./reconciliation-table";

export default async function TreasuryReconciliationPage(props: PageProps<"/treasury-reconciliation">) {
  const [paymentPerms, salaryPerms] = await Promise.all([
    getModulePermissions("PAYMENT_ENTRY"),
    getModulePermissions("SALARY_PAYMENT_ENTRY"),
  ]);
  if (!paymentPerms.can_view && !salaryPerms.can_view) {
    throw new ForbiddenError("Missing view permission on Payments or Salary Payments");
  }
  const departmentId = BigInt(paymentPerms.user.departmentId);

  const searchParams = await props.searchParams;
  const typeFilter = typeof searchParams.type === "string" ? searchParams.type : "ALL";
  const statusFilter = (typeof searchParams.status === "string" ? searchParams.status : "PENDING") as
    | "PENDING"
    | "RECONCILED"
    | "ALL";

  const rows = await getReconciliationRows(departmentId, {
    includePayments: paymentPerms.can_view && typeFilter !== "SALARY",
    includeSalaryPayments: salaryPerms.can_view && typeFilter !== "NON_SALARY",
    canEditPayments: paymentPerms.can_edit,
    canEditSalaryPayments: salaryPerms.can_edit,
    statusFilter,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reconciliation"
        title="Treasury Reconciliation"
        description="Enter the actual treasury payment date once the monthly reconciliation statement confirms it - until then, reports use the token generated date and flag it as estimated."
      />

      <Card>
        <CardContent className="pt-6">
          <ReportFilterBar
            fields={[
              {
                type: "select",
                name: "type",
                label: "Type",
                defaultValue: "ALL",
                options: [
                  { value: "ALL", label: "All" },
                  { value: "NON_SALARY", label: "Non-Salary Payments" },
                  { value: "SALARY", label: "Salary Payments" },
                ],
              },
              {
                type: "select",
                name: "status",
                label: "Status",
                defaultValue: "PENDING",
                options: [
                  { value: "PENDING", label: "Pending reconciliation" },
                  { value: "RECONCILED", label: "Reconciled" },
                  { value: "ALL", label: "All" },
                ],
              },
            ]}
          />
        </CardContent>
      </Card>

      <ReconciliationTable rows={rows} />
    </div>
  );
}
