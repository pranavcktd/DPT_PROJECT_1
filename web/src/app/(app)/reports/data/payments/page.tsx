import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireModulePermission } from "@/lib/session";
import { formatDateForReport } from "@/lib/reports";
import { formatINR } from "@/lib/utils";
import { getPaymentsReportRows, type PaymentStatusFilter } from "./data";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  SAVED: "secondary",
  APPROVED: "default",
  CANCELLED: "destructive",
};

export default async function PaymentsReportPage(props: PageProps<"/reports/data/payments">) {
  const user = await requireModulePermission("PAYMENT_ENTRY", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const search = typeof searchParams.q === "string" ? searchParams.q : "";
  const status = (typeof searchParams.status === "string" ? searchParams.status : "ALL") as PaymentStatusFilter;
  const from = typeof searchParams.from === "string" ? searchParams.from : "";
  const to = typeof searchParams.to === "string" ? searchParams.to : "";

  const rows = await getPaymentsReportRows(departmentId, search, status, from, to);
  const exportHref = `/api/reports/data/payments/export?q=${encodeURIComponent(search)}&status=${status}&from=${from}&to=${to}`;

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="Non-Salary Payments Report"
        description="Filter and export contractor payment entries."
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
              <input id="q" name="q" defaultValue={search} placeholder="Invoice #, contractor, work" className="h-9 w-64 rounded-md border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <select id="status" name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="ALL">All</option>
                <option value="SAVED">Saved</option>
                <option value="APPROVED">Approved</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="from" className="text-sm font-medium">Treasury Date From</label>
              <input id="from" name="from" type="date" defaultValue={from} className="h-9 rounded-md border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="to" className="text-sm font-medium">Treasury Date To</label>
              <input id="to" name="to" type="date" defaultValue={to} className="h-9 rounded-md border bg-background px-3 text-sm" />
            </div>
            <button type="submit" className={buttonVariants({ variant: "secondary" })}>Apply</button>
            <Link href="/reports/data/payments" className={buttonVariants({ variant: "ghost" })}>Reset</Link>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Work</TableHead>
                <TableHead className="text-right">Base Cost</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Treasury Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No payments match this filter.</TableCell>
                </TableRow>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id.toString()}>
                    <TableCell className="font-medium">{p.invoice_number}</TableCell>
                    <TableCell>{p.contractor_name_snapshot}</TableCell>
                    <TableCell>{p.work_name_snapshot}</TableCell>
                    <TableCell className="text-right">{formatINR(Number(p.base_cost))}</TableCell>
                    <TableCell className="text-right">{formatINR(Number(p.net_payable_amount ?? 0))}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge></TableCell>
                    <TableCell>{formatDateForReport(p.invoice_date)}</TableCell>
                    <TableCell>{formatDateForReport(p.treasury_payment_date)}</TableCell>
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
