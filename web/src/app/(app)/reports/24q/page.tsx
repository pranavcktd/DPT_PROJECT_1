import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { ReportFilterBar } from "@/components/report-filter-bar";
import { SendEmailDialog } from "@/components/send-email-dialog";
import { requireModulePermission } from "@/lib/session";
import { formatINR } from "@/lib/utils";
import { FY_QUARTERS, currentFinancialYear, financialYearOptions, formatDateForReport } from "@/lib/reports";
import { emailReportCsv } from "../email-actions";
import { get24qReportRows } from "./data";

function currentQuarter(): 1 | 2 | 3 | 4 {
  const month = new Date().getUTCMonth() + 1;
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  if (month >= 10 && month <= 12) return 3;
  return 4;
}

export default async function Form24qReportPage(props: PageProps<"/reports/24q">) {
  const user = await requireModulePermission("TAX_LEDGER_REPORT", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const fy = typeof searchParams.fy === "string" ? searchParams.fy : currentFinancialYear();
  const quarter = (Number(searchParams.quarter) || currentQuarter()) as 1 | 2 | 3 | 4;
  const employee = typeof searchParams.employee === "string" ? searchParams.employee : "";

  const rows = await get24qReportRows(departmentId, fy, quarter, employee || undefined);

  const totalGross = rows.reduce((sum, r) => sum + Number(r.gross_salary), 0);
  const totalTds = rows.reduce((sum, r) => sum + Number(r.it_deduction_amount ?? 0), 0);

  const exportHref = `/api/reports/24q/export?fy=${encodeURIComponent(fy)}&quarter=${quarter}${employee ? `&employee=${encodeURIComponent(employee)}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="TDS Quarterly Return (Form 24Q) - Salaried Employees"
        description="Employee-wise Income Tax TDS deducted, grouped by financial year and quarter, based on the treasury payment date."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton />
            <a href={exportHref} className={buttonVariants({ variant: "default" }) + " bg-orange-600 text-white hover:bg-orange-700"}>
              Export CSV
            </a>
            <SendEmailDialog action={emailReportCsv} extraFields={{ reportType: "24q", fy, quarter: String(quarter), employee }} />
          </div>
        }
      />

      <Card className="no-print">

<CardContent className="pt-6">
          <ReportFilterBar
            fields={[
              {
                type: "select",
                name: "fy",
                label: "Financial Year",
                defaultValue: fy,
                options: financialYearOptions().map((opt) => ({ value: opt, label: opt })),
              },
              {
                type: "select",
                name: "quarter",
                label: "Quarter",
                defaultValue: String(quarter),
                options: FY_QUARTERS.map((q) => ({ value: String(q.value), label: q.label })),
              },
              { type: "text", name: "employee", label: "Search Employee", placeholder: "Employee name" },
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
                <TableHead className="text-right">Gross Salary</TableHead>
                <TableHead className="text-right">Total IT TDS Deducted</TableHead>
                <TableHead>Payment Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No treasury-paid entries found for {fy} {FY_QUARTERS[quarter - 1].label}.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {rows.map((r) => (
                    <TableRow key={r.id.toString()}>
                      <TableCell className="font-medium">{r.employee_name_snapshot}</TableCell>
                      <TableCell>{r.employee_pan_snapshot ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(r.gross_salary))}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(r.it_deduction_amount ?? 0))}</TableCell>
                      <TableCell>{formatDateForReport(r.treasury_payment_date)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{formatINR(totalGross)}</TableCell>
                    <TableCell className="text-right">{formatINR(totalTds)}</TableCell>
                    <TableCell />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
