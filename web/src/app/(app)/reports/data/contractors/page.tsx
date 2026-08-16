import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { ReportFilterBar } from "@/components/report-filter-bar";
import { SendEmailDialog } from "@/components/send-email-dialog";
import { requireModulePermission } from "@/lib/session";
import { emailReportCsv } from "@/app/(app)/reports/email-actions";
import { getContractorsReportRows, type ContractorStatusFilter } from "./data";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  BLACKLISTED: "destructive",
};

export default async function ContractorsReportPage(props: PageProps<"/reports/data/contractors">) {
  const user = await requireModulePermission("CONTRACTOR_MASTER", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const search = typeof searchParams.q === "string" ? searchParams.q : "";
  const status = (typeof searchParams.status === "string" ? searchParams.status : "ALL") as ContractorStatusFilter;

  const rows = await getContractorsReportRows(departmentId, search, status);
  const exportHref = `/api/reports/data/contractors/export?q=${encodeURIComponent(search)}&status=${status}`;

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="Contractors Report"
        description="Filter and export the contractor directory."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton />
            <a href={exportHref} className={buttonVariants({ variant: "default" }) + " bg-orange-600 text-white hover:bg-orange-700"}>
              Export CSV
            </a>
            <SendEmailDialog action={emailReportCsv} extraFields={{ reportType: "contractors", q: search, status }} />
          </div>
        }
      />
      <Card className="no-print">
        <CardContent className="pt-6">
          <ReportFilterBar
            fields={[
              { type: "text", name: "q", label: "Search", placeholder: "Firm name, PAN, GSTIN, vendor code" },
              {
                type: "select",
                name: "status",
                label: "Status",
                defaultValue: "ALL",
                options: [
                  { value: "ALL", label: "All" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                  { value: "BLACKLISTED", label: "Blacklisted" },
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
                <TableHead>Firm Name</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Vendor Code</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No contractors match this filter.</TableCell>
                </TableRow>
              ) : (
                rows.map((c) => (
                  <TableRow key={c.id.toString()}>
                    <TableCell className="font-medium">{c.firm_name}</TableCell>
                    <TableCell>{c.pan_number}</TableCell>
                    <TableCell>{c.gstin ?? "-"}</TableCell>
                    <TableCell>{c.vendor_code ?? "-"}</TableCell>
                    <TableCell>{c.phone ?? "-"}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge></TableCell>
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
