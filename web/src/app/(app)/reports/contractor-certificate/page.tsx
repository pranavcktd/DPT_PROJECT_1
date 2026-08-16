import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { ReportFilterBar } from "@/components/report-filter-bar";
import { SendEmailDialog } from "@/components/send-email-dialog";
import { EstimatedDateBadge } from "@/components/estimated-date-badge";
import { requireModulePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateForReport } from "@/lib/reports";
import { formatINR } from "@/lib/utils";
import { getContractorCertificateRows } from "./data";
import { emailContractorPaymentCertificate } from "./email-actions";

export default async function ContractorCertificateReportPage(props: PageProps<"/reports/contractor-certificate">) {
  const user = await requireModulePermission("TAX_LEDGER_REPORT", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const contractors = await db.contractors.findMany({
    where: { department_id: departmentId },
    orderBy: { firm_name: "asc" },
    select: { id: true, firm_name: true, email: true },
  });

  const contractorId = typeof searchParams.contractor_id === "string" ? searchParams.contractor_id : "";
  const from = typeof searchParams.from === "string" ? searchParams.from : "";
  const to = typeof searchParams.to === "string" ? searchParams.to : "";

  const rows = contractorId ? await getContractorCertificateRows(departmentId, BigInt(contractorId), from, to) : [];
  const totalNet = rows.reduce((sum, r) => sum + Number(r.net_payable_amount ?? 0), 0);

  const certificateHref = `/api/reports/contractor-certificate?contractor_id=${contractorId}&from=${from}&to=${to}`;
  const selectedContractor = contractors.find((c) => c.id.toString() === contractorId);

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="Contractor Payment Certificate"
        description="Select a contractor and a date range to generate a payment certificate covering every payment to them in that period."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton />
            {contractorId ? (
              <a href={certificateHref} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "default" }) + " bg-orange-600 text-white hover:bg-orange-700"}>
                Generate PDF Certificate
              </a>
            ) : null}
            {contractorId ? (
              <SendEmailDialog
                action={emailContractorPaymentCertificate}
                defaultEmail={selectedContractor?.email ?? ""}
                extraFields={{ contractorId, from, to_date: to }}
                triggerLabel="Email Certificate"
              />
            ) : null}
          </div>
        }
      />

      <Card className="no-print">
        <CardContent className="pt-6">
          <ReportFilterBar
            fields={[
              {
                type: "select",
                name: "contractor_id",
                label: "Contractor",
                defaultValue: "",
                options: [{ value: "", label: "Select a contractor" }, ...contractors.map((c) => ({ value: c.id.toString(), label: c.firm_name }))],
              },
              { type: "date", name: "from", label: "Period From" },
              { type: "date", name: "to", label: "Period To" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          {!contractorId ? (
            <p className="text-center text-muted-foreground">Select a contractor to see their payments.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Work</TableHead>
                  <TableHead className="text-right">Base Cost</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead>Treasury Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No payments found for this contractor in the selected period.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {rows.map((r) => (
                      <TableRow key={r.id.toString()}>
                        <TableCell className="font-medium">{r.invoice_number}</TableCell>
                        <TableCell>{r.work_name_snapshot}</TableCell>
                        <TableCell className="text-right">{formatINR(Number(r.base_cost))}</TableCell>
                        <TableCell className="text-right">{formatINR(Number(r.total_deductions ?? 0))}</TableCell>
                        <TableCell className="text-right">{formatINR(Number(r.net_payable_amount ?? 0))}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateForReport(r.treasury_payment_date)}
                          <EstimatedDateBadge estimated={!!r.payment_date_is_estimated} />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right">{formatINR(totalNet)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
