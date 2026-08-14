import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireModulePermission } from "@/lib/session";
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
          <a href={exportHref} className={buttonVariants({ variant: "default" }) + " bg-orange-600 text-white hover:bg-orange-700"}>
            Export CSV
          </a>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label htmlFor="q" className="text-sm font-medium">Search</label>
              <input id="q" name="q" defaultValue={search} placeholder="Firm name, PAN, GSTIN, vendor code" className="h-9 w-64 rounded-md border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <select id="status" name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLACKLISTED">Blacklisted</option>
              </select>
            </div>
            <button type="submit" className={buttonVariants({ variant: "secondary" })}>Apply</button>
            <Link href="/reports/data/contractors" className={buttonVariants({ variant: "ghost" })}>Reset</Link>
          </form>
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
