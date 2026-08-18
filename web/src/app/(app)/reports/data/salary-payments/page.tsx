import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { ReportFilterBar } from "@/components/report-filter-bar";
import { SendEmailDialog } from "@/components/send-email-dialog";
import { EstimatedDateBadge } from "@/components/estimated-date-badge";
import { requireModulePermission } from "@/lib/session";
import { formatDateForReport } from "@/lib/reports";
import { formatINR } from "@/lib/utils";
import { emailReportCsv } from "@/app/(app)/reports/email-actions";
import { PAYMENT_TYPE_LABELS } from "@/app/(app)/salary-payments/schema";
import { getSalaryPaymentsReportRows, type SalaryPaymentStatusFilter } from "./data";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  SAVED: "secondary",
  APPROVED: "default",
  CANCELLED: "destructive",
};

export default async function SalaryPaymentsReportPage(props: PageProps<"/reports/data/salary-payments">) {
  const user = await requireModulePermission("SALARY_PAYMENT_ENTRY", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const search = typeof searchParams.q === "string" ? searchParams.q : "";
  const status = (typeof searchParams.status === "string" ? searchParams.status : "ALL") as SalaryPaymentStatusFilter;
  const from = typeof searchParams.from === "string" ? searchParams.from : "";
  const to = typeof searchParams.to === "string" ? searchParams.to : "";

  const rows = await getSalaryPaymentsReportRows(departmentId, search, status, from, to);
  const exportHref = `/api/reports/data/salary-payments/export?q=${encodeURIComponent(search)}&status=${status}&from=${from}&to=${to}`;

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="Salary Payments Report"
        description="Filter and export employee salary payment entries."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton />
            <a href={exportHref} className={buttonVariants({ variant: "default" }) + " bg-orange-600 text-white hover:bg-orange-700"}>
              Export CSV
            </a>
            <SendEmailDialog action={emailReportCsv} extraFields={{ reportType: "salary-payments", q: search, status, from, to }} />
          </div>
        }
      />
      <Card className="no-print">
        <CardContent className="pt-6">
          <ReportFilterBar
            fields={[
              { type: "text", name: "q", label: "Search", placeholder: "Employee name" },
              {
                type: "select",
                name: "status",
                label: "Status",
                defaultValue: "ALL",
                options: [
                  { value: "ALL", label: "All" },
                  { value: "SAVED", label: "Saved" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "CANCELLED", label: "Cancelled" },
                ],
              },
              { type: "date", name: "from", label: "Payment Date From" },
              { type: "date", name: "to", label: "Payment Date To" },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead className="text-right">Gross Salary</TableHead>
                <TableHead className="text-right">IT Deduction</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Token Generated Date</TableHead>
                <TableHead>Reconciled Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No salary payments match this filter.</TableCell>
                </TableRow>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id.toString()}>
                    <TableCell className="font-medium">{p.employee_name_snapshot}</TableCell>
                    <TableCell>{p.payment_type === "OTHER" ? p.other_type_label : PAYMENT_TYPE_LABELS[p.payment_type]}</TableCell>
                    <TableCell className="text-right">{formatINR(Number(p.gross_salary))}</TableCell>
                    <TableCell className="text-right">{formatINR(Number(p.it_deduction_amount))}</TableCell>
                    <TableCell className="text-right">{formatINR(Number(p.net_payable_amount ?? 0))}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateForReport(p.token_generated_date)}
                      <EstimatedDateBadge estimated={!!p.payment_date_is_estimated} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateForReport(p.actual_payment_date) || "Pending"}</TableCell>
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
