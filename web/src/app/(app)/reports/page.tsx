import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MODULE_ICONS, MODULE_THEME } from "@/lib/module-theme";
import { cn } from "@/lib/utils";
import { requireModulePermission } from "@/lib/session";

const REPORTS = [
  {
    href: "/reports/tds",
    title: "TDS Quarterly Return (Form 26Q)",
    description: "Contractor/party-wise Income Tax TDS deducted, grouped by financial year and quarter.",
  },
  {
    href: "/reports/gstr7",
    title: "GSTR-7",
    description: "Monthly GST TDS deducted per invoice, for the return due by the 10th of the next month.",
  },
];

export default async function ReportsPage() {
  await requireModulePermission("TAX_LEDGER_REPORT", "view");
  const Icon = MODULE_ICONS.reports;
  const theme = MODULE_THEME.reports;

  return (
    <div className="space-y-6">
      <PageHeader moduleKey="reports" title="Tax Reports" description="Statutory data for your quarterly and monthly filings." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20"
          >
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", theme.badge)}>
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-medium leading-tight">{r.title}</p>
              <p className="text-sm text-muted-foreground">{r.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
