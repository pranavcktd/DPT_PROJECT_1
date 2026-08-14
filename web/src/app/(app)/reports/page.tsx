import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MODULE_ICONS, MODULE_THEME, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";
import { getModulePermissions, requireModulePermission, type ModuleCode } from "@/lib/session";

const TAX_REPORTS = [
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
  {
    href: "/reports/24q",
    title: "TDS Quarterly Return (Form 24Q) - Salaried Employees",
    description: "Employee-wise salary TDS deducted, grouped by financial year and quarter.",
  },
];

const MODULE_REPORTS: { href: string; title: string; description: string; permissionModule: ModuleCode }[] = [
  { href: "/reports/data/contractors", title: "Contractors Report", description: "Search, filter, and export the contractor directory.", permissionModule: "CONTRACTOR_MASTER" },
  { href: "/reports/data/schemes", title: "Schemes Report", description: "Search, filter, and export scheme budgets.", permissionModule: "SCHEME_MASTER" },
  { href: "/reports/data/works", title: "Works Report", description: "Search, filter, and export work orders.", permissionModule: "WORK_MASTER" },
  { href: "/reports/data/payments", title: "Non-Salary Payments Report", description: "Search, filter, and export contractor payments.", permissionModule: "PAYMENT_ENTRY" },
  { href: "/reports/data/salary-payments", title: "Salary Payments Report", description: "Search, filter, and export employee salary payments.", permissionModule: "SALARY_PAYMENT_ENTRY" },
  { href: "/reports/data/certificates", title: "Certificates Report", description: "Search, filter, and export issued certificates.", permissionModule: "WORK_EXPERIENCE_CERTIFICATE" },
  { href: "/reports/data/employees", title: "Employees Report", description: "Search, filter, and export the employee directory.", permissionModule: "EMPLOYEE_MASTER" },
];

function ReportTile({ href, title, description, moduleKey }: { href: string; title: string; description: string; moduleKey: ModuleKey }) {
  const Icon = MODULE_ICONS[moduleKey];
  const theme = MODULE_THEME[moduleKey];
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20"
    >
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", theme.badge)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="font-medium leading-tight">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

export default async function ReportsPage() {
  await requireModulePermission("TAX_LEDGER_REPORT", "view");

  const visibleModuleReports = (
    await Promise.all(
      MODULE_REPORTS.map(async (r) => {
        const { can_view } = await getModulePermissions(r.permissionModule);
        return can_view ? r : null;
      }),
    )
  ).filter((r) => r !== null);

  return (
    <div className="space-y-8">
      <PageHeader moduleKey="reports" title="Reports" description="Statutory tax filings and filtered exports of your module data." />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tax Reports</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TAX_REPORTS.map((r) => (
            <ReportTile key={r.href} {...r} moduleKey="reports" />
          ))}
        </div>
      </div>

      {visibleModuleReports.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Module Reports</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visibleModuleReports.map((r) => (
              <ReportTile key={r.href} {...r} moduleKey="reports" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
