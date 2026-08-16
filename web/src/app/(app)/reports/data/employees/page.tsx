import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { ReportFilterBar } from "@/components/report-filter-bar";
import { SendEmailDialog } from "@/components/send-email-dialog";
import { requireModulePermission } from "@/lib/session";
import { formatDateForReport } from "@/lib/reports";
import { emailReportCsv } from "@/app/(app)/reports/email-actions";
import { getEmployeesReportRows, type EmployeeStatusFilter } from "./data";

export default async function EmployeesReportPage(props: PageProps<"/reports/data/employees">) {
  const user = await requireModulePermission("EMPLOYEE_MASTER", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const search = typeof searchParams.q === "string" ? searchParams.q : "";
  const status = (typeof searchParams.status === "string" ? searchParams.status : "ALL") as EmployeeStatusFilter;

  const rows = await getEmployeesReportRows(departmentId, search, status);
  const exportHref = `/api/reports/data/employees/export?q=${encodeURIComponent(search)}&status=${status}`;

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="Employees Report"
        description="Filter and export the employee directory."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton />
            <a href={exportHref} className={buttonVariants({ variant: "default" }) + " bg-orange-600 text-white hover:bg-orange-700"}>
              Export CSV
            </a>
            <SendEmailDialog action={emailReportCsv} extraFields={{ reportType: "employees", q: search, status }} />
          </div>
        }
      />
      <Card className="no-print">
        <CardContent className="pt-6">
          <ReportFilterBar
            fields={[
              { type: "text", name: "q", label: "Search", placeholder: "Employee name, PAN, mobile" },
              {
                type: "select",
                name: "status",
                label: "Status",
                defaultValue: "ALL",
                options: [
                  { value: "ALL", label: "All" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                ],
              },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead>Transfer Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No employees match this filter.</TableCell>
                </TableRow>
              ) : (
                rows.map((e) => (
                  <TableRow key={e.id.toString()}>
                    <TableCell className="font-medium">{e.employee_name}</TableCell>
                    <TableCell>{e.pan_number}</TableCell>
                    <TableCell>{e.mobile ?? "-"}</TableCell>
                    <TableCell>{formatDateForReport(e.joining_date)}</TableCell>
                    <TableCell>{formatDateForReport(e.transfer_date)}</TableCell>
                    <TableCell><Badge variant={e.status === "ACTIVE" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
