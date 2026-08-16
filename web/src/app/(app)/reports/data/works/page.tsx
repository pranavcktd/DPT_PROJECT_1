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
import { getWorksReportRows, type WorkStatusFilter } from "./data";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  ONGOING: "default",
  COMPLETED: "secondary",
  TERMINATED: "destructive",
};

export default async function WorksReportPage(props: PageProps<"/reports/data/works">) {
  const user = await requireModulePermission("WORK_MASTER", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const search = typeof searchParams.q === "string" ? searchParams.q : "";
  const status = (typeof searchParams.status === "string" ? searchParams.status : "ALL") as WorkStatusFilter;

  const rows = await getWorksReportRows(departmentId, search, status);
  const exportHref = `/api/reports/data/works/export?q=${encodeURIComponent(search)}&status=${status}`;

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="Works Report"
        description="Filter and export work orders."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton />
            <a href={exportHref} className={buttonVariants({ variant: "default" }) + " bg-orange-600 text-white hover:bg-orange-700"}>
              Export CSV
            </a>
            <SendEmailDialog action={emailReportCsv} extraFields={{ reportType: "works", q: search, status }} />
          </div>
        }
      />
      <Card className="no-print">
        <CardContent className="pt-6">
          <ReportFilterBar
            fields={[
              { type: "text", name: "q", label: "Search", placeholder: "Work name, scheme" },
              {
                type: "select",
                name: "status",
                label: "Status",
                defaultValue: "ALL",
                options: [
                  { value: "ALL", label: "All" },
                  { value: "ONGOING", label: "Ongoing" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "TERMINATED", label: "Terminated" },
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
                <TableHead>Work Name</TableHead>
                <TableHead>Scheme</TableHead>
                <TableHead className="text-right">Sanctioned Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No works match this filter.</TableCell>
                </TableRow>
              ) : (
                rows.map((w) => (
                  <TableRow key={w.id.toString()}>
                    <TableCell className="font-medium">{w.work_name}</TableCell>
                    <TableCell>{w.schemes.scheme_name}</TableCell>
                    <TableCell className="text-right">{formatINR(Number(w.sanctioned_cost))}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[w.status]}>{w.status}</Badge></TableCell>
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
