import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MODULE_ICONS, MODULE_THEME, type ModuleKey } from "@/lib/module-theme";
import { cn } from "@/lib/utils";
import { getModulePermissions, requireUser } from "@/lib/session";

const TILES: { moduleKey: ModuleKey; href: string; title: string; description: string; permissionModule: Parameters<typeof getModulePermissions>[0] }[] = [
  {
    moduleKey: "contractors",
    href: "/contractors",
    title: "Contractors",
    description: "Directory of approved firms",
    permissionModule: "CONTRACTOR_MASTER",
  },
  {
    moduleKey: "schemes",
    href: "/schemes",
    title: "Schemes",
    description: "Budgets by government scheme",
    permissionModule: "SCHEME_MASTER",
  },
  {
    moduleKey: "works",
    href: "/works",
    title: "Works",
    description: "Work orders raised on schemes",
    permissionModule: "WORK_MASTER",
  },
  {
    moduleKey: "payments",
    href: "/payments",
    title: "Payments",
    description: "RA bills and treasury references",
    permissionModule: "PAYMENT_ENTRY",
  },
  {
    moduleKey: "certificates",
    href: "/certificates",
    title: "Certificates",
    description: "Work experience certificates",
    permissionModule: "WORK_EXPERIENCE_CERTIFICATE",
  },
  {
    moduleKey: "department",
    href: "/department",
    title: "Department Profile",
    description: "Letterhead, DDO, and identity",
    permissionModule: "DEPARTMENT_SETTINGS",
  },
];

export default async function DashboardPage() {
  const user = await requireUser();

  const tiles = user.departmentId
    ? (
        await Promise.all(
          TILES.map(async (tile) => {
            const { can_view } = await getModulePermissions(tile.permissionModule);
            return can_view ? tile : null;
          }),
        )
      ).filter((t) => t !== null)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="dashboard"
        title={`Welcome, ${user.name}`}
        description={user.departmentId ? "Pick up where you left off." : "Software Company Super Admin"}
      />

      {tiles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => {
            const Icon = MODULE_ICONS[tile.moduleKey];
            const theme = MODULE_THEME[tile.moduleKey];
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20"
              >
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", theme.badge)}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{tile.title}</p>
                  <p className="text-sm text-muted-foreground">{tile.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No modules are available for your account yet.</p>
      )}
    </div>
  );
}
