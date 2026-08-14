import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireModulePermission } from "@/lib/session";
import { formatINR } from "@/lib/utils";
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
              <input id="q" name="q" defaultValue={search} placeholder="Work name, scheme" className="h-9 w-64 rounded-md border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <select id="status" name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="ALL">All</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
            <button type="submit" className={buttonVariants({ variant: "secondary" })}>Apply</button>
            <Link href="/reports/data/works" className={buttonVariants({ variant: "ghost" })}>Reset</Link>
          </form>
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
