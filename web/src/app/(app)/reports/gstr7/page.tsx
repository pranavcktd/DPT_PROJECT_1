import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireModulePermission } from "@/lib/session";
import { formatINR } from "@/lib/utils";
import { MONTHS, formatDateForReport } from "@/lib/reports";
import { getGstr7ReportRows } from "./data";

export default async function Gstr7ReportPage(props: PageProps<"/reports/gstr7">) {
  const user = await requireModulePermission("TAX_LEDGER_REPORT", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const now = new Date();
  const year = Number(searchParams.year) || now.getUTCFullYear();
  const month = Number(searchParams.month) || now.getUTCMonth() + 1;
  const contractor = typeof searchParams.contractor === "string" ? searchParams.contractor : "";

  const rows = await getGstr7ReportRows(departmentId, year, month, contractor || undefined);

  const totals = rows.reduce(
    (acc, r) => ({
      baseCost: acc.baseCost + Number(r.base_cost),
      billValue: acc.billValue + Number(r.total_bill_value ?? 0),
      igst: acc.igst + Number(r.igst_tds_amount ?? 0),
      cgst: acc.cgst + Number(r.cgst_tds_amount ?? 0),
      sgst: acc.sgst + Number(r.sgst_tds_amount ?? 0),
    }),
    { baseCost: 0, billValue: 0, igst: 0, cgst: 0, sgst: 0 },
  );

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getUTCFullYear() + 1 - i);
  const exportHref = `/api/reports/gstr7/export?year=${year}&month=${month}${contractor ? `&contractor=${encodeURIComponent(contractor)}` : ""}`;
  const monthLabel = MONTHS[month - 1].label;

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="GSTR-7"
        description="Monthly GST TDS deducted per invoice, based on the treasury payment date - file by the 10th of the next month."
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
              <label htmlFor="month" className="text-sm font-medium">
                Month
              </label>
              <select id="month" name="month" defaultValue={month} className="h-9 rounded-md border bg-background px-3 text-sm">
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="year" className="text-sm font-medium">
                Year
              </label>
              <select id="year" name="year" defaultValue={year} className="h-9 rounded-md border bg-background px-3 text-sm">
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="contractor" className="text-sm font-medium">
                Search Contractor
              </label>
              <input
                id="contractor"
                name="contractor"
                defaultValue={contractor}
                placeholder="Contractor / party name"
                className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <button type="submit" className={buttonVariants({ variant: "secondary" })}>
              Apply
            </button>
            <Link href="/reports/gstr7" className={buttonVariants({ variant: "ghost" })}>
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor Name</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead className="text-right">Total Bill Value (C)</TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead className="text-right">Base Cost (A)</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    No treasury-paid entries found for {monthLabel} {year}.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {rows.map((r) => (
                    <TableRow key={r.id.toString()}>
                      <TableCell className="font-medium whitespace-nowrap">{r.contractor_name_snapshot}</TableCell>
                      <TableCell>{r.contractor_gstin_snapshot ?? "-"}</TableCell>
                      <TableCell>{r.invoice_number}</TableCell>
                      <TableCell>{formatDateForReport(r.invoice_date)}</TableCell>
                      <TableCell>{formatDateForReport(r.treasury_payment_date)}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(r.total_bill_value ?? 0))}</TableCell>
                      <TableCell>{r.contractors.phone ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(r.base_cost))}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(r.igst_tds_amount ?? 0))}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(r.cgst_tds_amount ?? 0))}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(r.sgst_tds_amount ?? 0))}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell colSpan={5}>Total</TableCell>
                    <TableCell className="text-right">{formatINR(totals.billValue)}</TableCell>
                    <TableCell />
                    <TableCell className="text-right">{formatINR(totals.baseCost)}</TableCell>
                    <TableCell className="text-right">{formatINR(totals.igst)}</TableCell>
                    <TableCell className="text-right">{formatINR(totals.cgst)}</TableCell>
                    <TableCell className="text-right">{formatINR(totals.sgst)}</TableCell>
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
