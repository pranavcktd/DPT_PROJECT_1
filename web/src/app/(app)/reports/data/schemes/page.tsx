import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { ReportFilterBar } from "@/components/report-filter-bar";
import { SendEmailDialog } from "@/components/send-email-dialog";
import { requireModulePermission } from "@/lib/session";
import { formatINR } from "@/lib/utils";
import { emailReportCsv } from "@/app/(app)/reports/email-actions";
import { getSchemesReportRows, type SchemeStatusFilter } from "./data";

export default async function SchemesReportPage(props: PageProps<"/reports/data/schemes">) {
  const user = await requireModulePermission("SCHEME_MASTER", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const search = typeof searchParams.q === "string" ? searchParams.q : "";
  const status = (typeof searchParams.status === "string" ? searchParams.status : "ALL") as SchemeStatusFilter;

  const rows = await getSchemesReportRows(departmentId, search, status);
  const exportHref = `/api/reports/data/schemes/export?q=${encodeURIComponent(search)}&status=${status}`;

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="Schemes Report"
        description="Filter and export scheme budgets and allocation."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton />
            <a href={exportHref} className={buttonVariants({ variant: "default" }) + " bg-orange-600 text-white hover:bg-orange-700"}>
              Export CSV
            </a>
            <SendEmailDialog action={emailReportCsv} extraFields={{ reportType: "schemes", q: search, status }} />
          </div>
        }
      />
      <Card className="no-print">
        <CardContent className="pt-6">
          <ReportFilterBar
            fields={[
              { type: "text", name: "q", label: "Search", placeholder: "Scheme name" },
              {
                type: "select",
                name: "status",
                label: "Status",
                defaultValue: "ALL",
                options: [
                  { value: "ALL", label: "All" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "CLOSED", label: "Closed" },
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
                <TableHead>Scheme Name</TableHead>
                <TableHead>Financial Year</TableHead>
                <TableHead className="text-right">Sanctioned</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No schemes match this filter.</TableCell>
                </TableRow>
              ) : (
                rows.map((s) => {
                  const sanctioned = Number(s.sanctioned_budget);
                  const remaining = sanctioned - s.allocated;
                  return (
                    <TableRow key={s.id.toString()}>
                      <TableCell className="font-medium">{s.scheme_name}</TableCell>
                      <TableCell>{s.financial_year}</TableCell>
                      <TableCell className="text-right">{formatINR(sanctioned)}</TableCell>
                      <TableCell className="text-right">{formatINR(s.allocated)}</TableCell>
                      <TableCell className="text-right">{formatINR(remaining)}</TableCell>
                      <TableCell><Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
