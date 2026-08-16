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
 * Single source of truth for module order, consumed by both the sidebar
 * (src/app/(app)/layout.tsx) and the dashboard tile grid
 * (src/app/(app)/dashboard/page.tsx) so they can't drift apart. Dashboard
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
    key: "schemes",
    moduleCode: "SCHEME_MASTER",
    href: "/schemes",
    navLabel: "Schemes",
    dashboardTitle: "Schemes",
    dashboardDescription: "Budgets by government scheme",
  },
  {
    key: "works",
    moduleCode: "WORK_MASTER",
    href: "/works",
    navLabel: "Works",
    dashboardTitle: "Works",
    dashboardDescription: "Work orders raised on schemes",
  },
  {
    key: "payments",
    moduleCode: "PAYMENT_ENTRY",
    href: "/payments",
    navLabel: "Payments",
    dashboardTitle: "Payments",
    dashboardDescription: "RA bills and treasury references",
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
    key: "department",
    moduleCode: "DEPARTMENT_SETTINGS",
    href: "/department",
    navLabel: "Department Profile",
    dashboardTitle: "Department Profile",
    dashboardDescription: "Letterhead, DDO, and identity",
  },
];
