import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { ReportFilterBar } from "@/components/report-filter-bar";
import { SendEmailDialog } from "@/components/send-email-dialog";
import { requireModulePermission } from "@/lib/session";
import { formatDateForReport } from "@/lib/reports";
import { formatEnumLabel } from "@/lib/utils";
import { emailReportCsv } from "@/app/(app)/reports/email-actions";
import { getCertificatesReportRows } from "./data";

export default async function CertificatesReportPage(props: PageProps<"/reports/data/certificates">) {
  const user = await requireModulePermission("WORK_EXPERIENCE_CERTIFICATE", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const search = typeof searchParams.q === "string" ? searchParams.q : "";
  const rows = await getCertificatesReportRows(departmentId, search);
  const exportHref = `/api/reports/data/certificates/export?q=${encodeURIComponent(search)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="Certificates Report"
        description="Filter and export issued work experience certificates."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton />
            <a href={exportHref} className={buttonVariants({ variant: "default" }) + " bg-orange-600 text-white hover:bg-orange-700"}>
              Export CSV
            </a>
            <SendEmailDialog action={emailReportCsv} extraFields={{ reportType: "certificates", q: search }} />
          </div>
        }
      />
      <Card className="no-print">
        <CardContent className="pt-6">
          <ReportFilterBar
            fields={[{ type: "text", name: "q", label: "Search", placeholder: "Certificate #, contractor, work" }]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate #</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Work</TableHead>
                <TableHead className="text-right">Executed Value</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No certificates match this filter.</TableCell>
                </TableRow>
              ) : (
                rows.map((c) => (
                  <TableRow key={c.id.toString()}>
                    <TableCell className="font-medium">{c.certificate_number}</TableCell>
                    <TableCell>{c.contractors.firm_name}</TableCell>
                    <TableCell>{c.works.work_name}</TableCell>
                    <TableCell className="text-right">₹{Number(c.executed_value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{c.performance_rating_label ? formatEnumLabel(c.performance_rating_label) : "-"}</TableCell>
                    <TableCell>{formatDateForReport(c.issued_at)}</TableCell>
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
