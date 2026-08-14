import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireModulePermission } from "@/lib/session";
import { formatINR } from "@/lib/utils";
import { FY_QUARTERS, currentFinancialYear, financialYearOptions, formatDateForReport } from "@/lib/reports";
import { getTdsReportRows } from "./data";

function currentQuarter(): 1 | 2 | 3 | 4 {
  const month = new Date().getUTCMonth() + 1; // 1-12
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  if (month >= 10 && month <= 12) return 3;
  return 4;
}

export default async function TdsReportPage(props: PageProps<"/reports/tds">) {
  const user = await requireModulePermission("TAX_LEDGER_REPORT", "view");
  const departmentId = BigInt(user.departmentId);
  const searchParams = await props.searchParams;

  const fy = typeof searchParams.fy === "string" ? searchParams.fy : currentFinancialYear();
  const quarter = (Number(searchParams.quarter) || currentQuarter()) as 1 | 2 | 3 | 4;
  const contractor = typeof searchParams.contractor === "string" ? searchParams.contractor : "";

  const rows = await getTdsReportRows(departmentId, fy, quarter, contractor || undefined);

  const totalBase = rows.reduce((sum, r) => sum + Number(r.base_cost), 0);
  const totalTds = rows.reduce((sum, r) => sum + Number(r.it_tds_amount ?? 0), 0);

  const exportHref = `/api/reports/tds/export?fy=${encodeURIComponent(fy)}&quarter=${quarter}${contractor ? `&contractor=${encodeURIComponent(contractor)}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="reports"
        title="TDS Quarterly Return (Form 26Q)"
        description="Income Tax TDS deducted, grouped by financial year and quarter, based on the treasury payment date."
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
              <label htmlFor="fy" className="text-sm font-medium">
                Financial Year
              </label>
              <select id="fy" name="fy" defaultValue={fy} className="h-9 rounded-md border bg-background px-3 text-sm">
                {financialYearOptions().map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="quarter" className="text-sm font-medium">
                Quarter
              </label>
              <select id="quarter" name="quarter" defaultValue={quarter} className="h-9 rounded-md border bg-background px-3 text-sm">
                {FY_QUARTERS.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
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
            <Link href="/reports/tds" className={buttonVariants({ variant: "ghost" })}>
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor / Party Name</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead className="text-right">Base Cost (A)</TableHead>
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
                      <TableCell className="font-medium">{r.contractor_name_snapshot}</TableCell>
                      <TableCell>{r.contractor_pan_snapshot ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(r.base_cost))}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(r.it_tds_amount ?? 0))}</TableCell>
                      <TableCell>{formatDateForReport(r.treasury_payment_date)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{formatINR(totalBase)}</TableCell>
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
