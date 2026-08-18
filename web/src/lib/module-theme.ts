import {
  LayoutDashboard,
  Users,
  FolderKanban,
  HardHat,
  Receipt,
  Award,
  Building2,
  ShieldCheck,
  KeyRound,
  FileBarChart,
  UserRound,
  Wallet,
  UserCog,
  History,
  IdCard,
  Landmark,
  FileCheck2,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "dashboard"
  | "contractors"
  | "schemes"
  | "works"
  | "payments"
  | "certificates"
  | "department"
  | "superAdmin"
  | "account"
  | "reports"
  | "employees"
  | "salaryPayments"
  | "staff"
  | "auditLogs"
  | "partyMaster"
  | "otherPayments"
  | "reconciliation"
  | "notices";

export const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  contractors: Users,
  schemes: FolderKanban,
  works: HardHat,
  payments: Receipt,
  certificates: Award,
  department: Building2,
  superAdmin: ShieldCheck,
  account: KeyRound,
  reports: FileBarChart,
  employees: UserRound,
  salaryPayments: Wallet,
  staff: UserCog,
  auditLogs: History,
  partyMaster: IdCard,
  otherPayments: Landmark,
  reconciliation: FileCheck2,
  notices: Megaphone,
};

/**
 * One accent colour per module so the app reads as colour-coded areas
 * instead of one flat greyscale theme (the base shadcn theme here has zero
 * saturation on every token - see globals.css). Classes are written out in
 * full rather than built from a `color` string, because Tailwind's compiler
 * only picks up literal class names, not `bg-${color}-600` interpolations.
 */
export const MODULE_THEME: Record<
  ModuleKey,
  {
    /** icon "badge" background + icon colour, used at rest (sidebar, page header) */
    badge: string;
    /** sidebar nav row background + text when this module is the active route */
    navActive: string;
    /** solid CTA button colours for this module's primary action */
    button: string;
    /** light pill background + text + border, e.g. for small tags */
    pill: string;
    /** accent used for progress bars / highlight boxes within the module */
    accentBar: string;
    accentBox: string;
    /** heading text colour for section titles within the module */
    text: string;
  }
> = {
  dashboard: {
    badge: "bg-indigo-100 text-indigo-600",
    navActive: "bg-indigo-600 text-white",
    button: "bg-indigo-600 text-white hover:bg-indigo-700",
    pill: "bg-indigo-50 text-indigo-700 border-indigo-200",
    accentBar: "bg-indigo-500",
    accentBox: "bg-indigo-600",
    text: "text-indigo-700",
  },
  contractors: {
    badge: "bg-blue-100 text-blue-600",
    navActive: "bg-blue-600 text-white",
    button: "bg-blue-600 text-white hover:bg-blue-700",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    accentBar: "bg-blue-500",
    accentBox: "bg-blue-600",
    text: "text-blue-700",
  },
  schemes: {
    badge: "bg-violet-100 text-violet-600",
    navActive: "bg-violet-600 text-white",
    button: "bg-violet-600 text-white hover:bg-violet-700",
    pill: "bg-violet-50 text-violet-700 border-violet-200",
    accentBar: "bg-violet-500",
    accentBox: "bg-violet-600",
    text: "text-violet-700",
  },
  works: {
    badge: "bg-amber-100 text-amber-700",
    navActive: "bg-amber-500 text-white",
    button: "bg-amber-500 text-white hover:bg-amber-600",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    accentBar: "bg-amber-500",
    accentBox: "bg-amber-500",
    text: "text-amber-700",
  },
  payments: {
    badge: "bg-emerald-100 text-emerald-700",
    navActive: "bg-emerald-600 text-white",
    button: "bg-emerald-600 text-white hover:bg-emerald-700",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accentBar: "bg-emerald-500",
    accentBox: "bg-emerald-600",
    text: "text-emerald-700",
  },
  certificates: {
    badge: "bg-rose-100 text-rose-600",
    navActive: "bg-rose-600 text-white",
    button: "bg-rose-600 text-white hover:bg-rose-700",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    accentBar: "bg-rose-500",
    accentBox: "bg-rose-600",
    text: "text-rose-700",
  },
  department: {
    badge: "bg-teal-100 text-teal-700",
    navActive: "bg-teal-600 text-white",
    button: "bg-teal-600 text-white hover:bg-teal-700",
    pill: "bg-teal-50 text-teal-700 border-teal-200",
    accentBar: "bg-teal-500",
    accentBox: "bg-teal-600",
    text: "text-teal-700",
  },
  superAdmin: {
    badge: "bg-fuchsia-100 text-fuchsia-700",
    navActive: "bg-fuchsia-600 text-white",
    button: "bg-fuchsia-600 text-white hover:bg-fuchsia-700",
    pill: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    accentBar: "bg-fuchsia-500",
    accentBox: "bg-fuchsia-600",
    text: "text-fuchsia-700",
  },
  account: {
    badge: "bg-slate-100 text-slate-700",
    navActive: "bg-slate-600 text-white",
    button: "bg-slate-600 text-white hover:bg-slate-700",
    pill: "bg-slate-50 text-slate-700 border-slate-200",
    accentBar: "bg-slate-500",
    accentBox: "bg-slate-600",
    text: "text-slate-700",
  },
  reports: {
    badge: "bg-orange-100 text-orange-700",
    navActive: "bg-orange-600 text-white",
    button: "bg-orange-600 text-white hover:bg-orange-700",
    pill: "bg-orange-50 text-orange-700 border-orange-200",
    accentBar: "bg-orange-500",
    accentBox: "bg-orange-600",
    text: "text-orange-700",
  },
  employees: {
    badge: "bg-cyan-100 text-cyan-700",
    navActive: "bg-cyan-600 text-white",
    button: "bg-cyan-600 text-white hover:bg-cyan-700",
    pill: "bg-cyan-50 text-cyan-700 border-cyan-200",
    accentBar: "bg-cyan-500",
    accentBox: "bg-cyan-600",
    text: "text-cyan-700",
  },
  salaryPayments: {
    badge: "bg-lime-100 text-lime-700",
    navActive: "bg-lime-600 text-white",
    button: "bg-lime-600 text-white hover:bg-lime-700",
    pill: "bg-lime-50 text-lime-700 border-lime-200",
    accentBar: "bg-lime-500",
    accentBox: "bg-lime-600",
    text: "text-lime-700",
  },
  staff: {
    badge: "bg-pink-100 text-pink-700",
    navActive: "bg-pink-600 text-white",
    button: "bg-pink-600 text-white hover:bg-pink-700",
    pill: "bg-pink-50 text-pink-700 border-pink-200",
    accentBar: "bg-pink-500",
    accentBox: "bg-pink-600",
    text: "text-pink-700",
  },
  auditLogs: {
    badge: "bg-stone-200 text-stone-700",
    navActive: "bg-stone-600 text-white",
    button: "bg-stone-600 text-white hover:bg-stone-700",
    pill: "bg-stone-100 text-stone-700 border-stone-300",
    accentBar: "bg-stone-500",
    accentBox: "bg-stone-600",
    text: "text-stone-700",
  },
  partyMaster: {
    badge: "bg-sky-100 text-sky-700",
    navActive: "bg-sky-600 text-white",
    button: "bg-sky-600 text-white hover:bg-sky-700",
    pill: "bg-sky-50 text-sky-700 border-sky-200",
    accentBar: "bg-sky-500",
    accentBox: "bg-sky-600",
    text: "text-sky-700",
  },
  otherPayments: {
    badge: "bg-purple-100 text-purple-700",
    navActive: "bg-purple-600 text-white",
    button: "bg-purple-600 text-white hover:bg-purple-700",
    pill: "bg-purple-50 text-purple-700 border-purple-200",
    accentBar: "bg-purple-500",
    accentBox: "bg-purple-600",
    text: "text-purple-700",
  },
  reconciliation: {
    badge: "bg-yellow-100 text-yellow-700",
    navActive: "bg-yellow-600 text-white",
    button: "bg-yellow-600 text-white hover:bg-yellow-700",
    pill: "bg-yellow-50 text-yellow-700 border-yellow-200",
    accentBar: "bg-yellow-500",
    accentBox: "bg-yellow-600",
    text: "text-yellow-700",
  },
  notices: {
    badge: "bg-red-100 text-red-700",
    navActive: "bg-red-600 text-white",
    button: "bg-red-600 text-white hover:bg-red-700",
    pill: "bg-red-50 text-red-700 border-red-200",
    accentBar: "bg-red-500",
    accentBox: "bg-red-600",
    text: "text-red-700",
  },
};
