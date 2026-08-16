import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MODULE_ICONS, MODULE_THEME } from "@/lib/module-theme";
import { MODULE_REGISTRY } from "@/lib/module-registry";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { getModulePermissions, requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.roleCode === "SUPER_ADMIN") {
    const [total, active, inactive] = await Promise.all([
      db.departments.count(),
      db.departments.count({ where: { status: "ACTIVE" } }),
      db.departments.count({ where: { status: "INACTIVE" } }),
    ]);

    const stats = [
      { label: "Departments onboarded", value: total },
      { label: "Active", value: active },
      { label: "Disabled", value: inactive },
    ];

    return (
      <div className="space-y-6">
        <PageHeader moduleKey="dashboard" title={`Welcome, ${user.name}`} description="Software Company Super Admin" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card p-4">
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        <Link
          href="/super-admin/departments"
          className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40 sm:max-w-sm"
        >
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", MODULE_THEME.superAdmin.badge)}>
            {(() => {
              const Icon = MODULE_ICONS.superAdmin;
              return <Icon className="size-5" />;
            })()}
          </div>
          <div className="min-w-0">
            <p className="font-medium leading-tight">Manage Departments</p>
            <p className="text-sm text-muted-foreground">Onboard, disable, or manage subscriptions</p>
          </div>
        </Link>
      </div>
    );
  }

  const tiles = user.departmentId
    ? (
        await Promise.all(
          MODULE_REGISTRY.map(async (entry) => {
            const { can_view } = await getModulePermissions(entry.moduleCode);
            return can_view
              ? { moduleKey: entry.key, href: entry.href, title: entry.dashboardTitle, description: entry.dashboardDescription }
              : null;
          }),
        )
      ).filter((t) => t !== null)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader moduleKey="dashboard" title={`Welcome, ${user.name}`} description="Pick up where you left off." />

      {tiles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => {
            const Icon = MODULE_ICONS[tile.moduleKey];
            const theme = MODULE_THEME[tile.moduleKey];
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40"
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
