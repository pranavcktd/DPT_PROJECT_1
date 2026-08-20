import type { ModuleCode } from "@/lib/session";
import type { ModuleKey } from "@/lib/module-theme";

export type ModuleRegistryEntry = {
  key: ModuleKey;
  moduleCode: ModuleCode;
  href: string;
  navLabel: string;
  dashboardTitle: string;
  dashboardDescription: string;
};

/**
 * Single source of truth for every leaf module - the ones with a real
 * `ModuleCode` permission behind them. Consumed by both the sidebar
 * (nested per NAV_TREE below) and the dashboard tile grid
 * (src/app/(app)/dashboard/page.tsx), so they can't drift apart. Dashboard
 * itself isn't listed here - it's the page you're already on, and stays a
 * separate hardcoded first entry in the sidebar.
 */
export const MODULE_REGISTRY: ModuleRegistryEntry[] = [
  {
    key: "contractors",
    moduleCode: "CONTRACTOR_MASTER",
    href: "/contractors",
    navLabel: "Contractors",
    dashboardTitle: "Contractors",
    dashboardDescription: "Directory of approved firms",
  },
  {
    key: "employees",
    moduleCode: "EMPLOYEE_MASTER",
    href: "/employees",
    navLabel: "Employees",
    dashboardTitle: "Employees",
    dashboardDescription: "Departmental staff directory",
  },
  {
    key: "salaryPayments",
    moduleCode: "SALARY_PAYMENT_ENTRY",
    href: "/salary-payments",
    navLabel: "Salary Payments",
    dashboardTitle: "Salary Payments",
    dashboardDescription: "Salary, DA, arrears, and other employee payments",
  },
  {
    key: "schemes",
    moduleCode: "SCHEME_MASTER",
    href: "/schemes",
    navLabel: "Scheme",
    dashboardTitle: "Schemes",
    dashboardDescription: "Budgets by government scheme",
  },
  {
    key: "works",
    moduleCode: "WORK_MASTER",
    href: "/works",
    navLabel: "Work",
    dashboardTitle: "Works",
    dashboardDescription: "Work orders raised on schemes",
  },
  {
    key: "payments",
    moduleCode: "PAYMENT_ENTRY",
    href: "/payments",
    navLabel: "Payments",
    dashboardTitle: "Non-Salary Payments",
    dashboardDescription: "RA bills and treasury references",
  },
  {
    key: "certificates",
    moduleCode: "WORK_EXPERIENCE_CERTIFICATE",
    href: "/certificates",
    navLabel: "Certificates",
    dashboardTitle: "Certificates",
    dashboardDescription: "Work experience certificates",
  },
  {
    key: "reports",
    moduleCode: "TAX_LEDGER_REPORT",
    href: "/reports",
    navLabel: "Reports",
    dashboardTitle: "Reports",
    dashboardDescription: "Statutory filings and data exports",
  },
  {
    key: "staff",
    moduleCode: "USER_MANAGEMENT",
    href: "/staff",
    navLabel: "Staff Management",
    dashboardTitle: "Staff Management",
    dashboardDescription: "Create staff accounts and set module access",
  },
  {
    key: "auditLogs",
    moduleCode: "AUDIT_LOGS",
    href: "/audit-logs",
    navLabel: "Audit Logs",
    dashboardTitle: "Audit Logs",
    dashboardDescription: "Track user activity and record changes",
  },
  {
    key: "department",
    moduleCode: "DEPARTMENT_SETTINGS",
    href: "/department",
    navLabel: "Department Profile",
    dashboardTitle: "Department Profile",
    dashboardDescription: "Letterhead, DDO, and identity",
  },
  {
    key: "backup",
    moduleCode: "DEPARTMENT_SETTINGS",
    href: "/department/backup",
    navLabel: "Backup & Database",
    dashboardTitle: "Backup & Database",
    dashboardDescription: "Export/restore your data and clear dummy data",
  },
];

export const MODULE_REGISTRY_BY_KEY: Record<ModuleKey, ModuleRegistryEntry | undefined> = Object.fromEntries(
  MODULE_REGISTRY.map((entry) => [entry.key, entry]),
) as Record<ModuleKey, ModuleRegistryEntry | undefined>;

export type NavTreeNode =
  | { type: "link"; key: ModuleKey }
  // A leaf not backed by its own ModuleCode/permission row - visible when the
  // user has "view" on ANY of the listed modules (e.g. Treasury Reconciliation
  // spans both Payments modules; per-row edit is still enforced separately).
  | { type: "link-custom"; href: string; label: string; icon: ModuleKey; requiresAnyView: ModuleCode[] }
  | { type: "group"; label: string; icon: ModuleKey; children: NavTreeNode[] };

/**
 * The sidebar's module -> sub-module workflow grouping, per the 2026-08-17
 * request: Party Master groups the two "who are we dealing with" masters,
 * and Payments groups Salary Payments alongside the Scheme -> Work ->
 * Payment chain that a non-salary bill actually flows through (a work needs
 * a scheme, a payment needs a work). Leaf `key`s resolve against
 * MODULE_REGISTRY above; each still carries its own `ModuleCode` permission
 * check, so grouping is purely a navigation/UX layer, not a new permission.
 */
export const NAV_TREE: NavTreeNode[] = [
  {
    type: "group",
    label: "Party Master",
    icon: "partyMaster",
    children: [
      { type: "link", key: "contractors" },
      { type: "link", key: "employees" },
    ],
  },
  {
    type: "group",
    label: "Payments",
    icon: "payments",
    children: [
      { type: "link", key: "salaryPayments" },
      {
        type: "group",
        label: "Other Than Salary Payments",
        icon: "otherPayments",
        children: [
          { type: "link", key: "schemes" },
          { type: "link", key: "works" },
          { type: "link", key: "payments" },
        ],
      },
      {
        type: "link-custom",
        href: "/treasury-reconciliation",
        label: "Treasury Reconciliation",
        icon: "reconciliation",
        requiresAnyView: ["PAYMENT_ENTRY", "SALARY_PAYMENT_ENTRY"],
      },
    ],
  },
  { type: "link", key: "certificates" },
  { type: "link", key: "reports" },
  { type: "link", key: "staff" },
  { type: "link", key: "auditLogs" },
  { type: "link", key: "department" },
  { type: "link", key: "backup" },
];
