import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MODULE_ICONS, MODULE_THEME, type ModuleKey } from "@/lib/module-theme";
import { MODULE_REGISTRY_BY_KEY, NAV_TREE, type NavTreeNode } from "@/lib/module-registry";
import { cn, formatDateTime } from "@/lib/utils";
import { db } from "@/lib/db";
import { getModulePermissions, requireUser } from "@/lib/session";

type Tile = { moduleKey: ModuleKey; href: string; title: string; description: string };
type Section = { label: string | null; icon: ModuleKey | null; tiles: Tile[] };

async function resolveLeafTile(node: NavTreeNode): Promise<Tile | null> {
  if (node.type === "link") {
    const entry = MODULE_REGISTRY_BY_KEY[node.key];
    if (!entry) return null;
    const { can_view } = await getModulePermissions(entry.moduleCode);
    return can_view
      ? { moduleKey: entry.key, href: entry.href, title: entry.dashboardTitle, description: entry.dashboardDescription }
      : null;
  }
  if (node.type === "link-custom") {
    const permissions = await Promise.all(node.requiresAnyView.map((code) => getModulePermissions(code)));
    const visible = permissions.some((p) => p.can_view);
    return visible
      ? {
          moduleKey: node.icon,
          href: node.href,
          title: node.label,
          description: "Enter the actual treasury payment date once the reconciliation statement confirms it",
        }
      : null;
  }
  return null;
}

async function collectTiles(node: NavTreeNode): Promise<Tile[]> {
  if (node.type === "group") {
    const nested = await Promise.all(node.children.map(collectTiles));
    return nested.flat();
  }
  const tile = await resolveLeafTile(node);
  return tile ? [tile] : [];
}

/** Mirrors NAV_TREE's top-level grouping (flattened one level deep, so a
 * card grid stays a grid rather than nesting cards within cards) so the
 * dashboard reads as the same module -> sub-module workflow as the sidebar. */
async function resolveSections(nodes: NavTreeNode[]): Promise<Section[]> {
  const sections = await Promise.all(
    nodes.map(async (node): Promise<Section> => {
      if (node.type === "group") {
        const tiles = await collectTiles(node);
        return { label: node.label, icon: node.icon, tiles };
      }
      const tile = await resolveLeafTile(node);
      return { label: null, icon: null, tiles: tile ? [tile] : [] };
    }),
  );
  return sections.filter((s) => s.tiles.length > 0);
}

function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
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
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const lastLoginBanner = (
    <p className="text-sm text-muted-foreground">
      {user.previousLoginAt ? `Your last login was on ${formatDateTime(user.previousLoginAt)}.` : "This is your first login."}
    </p>
  );

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
        {lastLoginBanner}
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

  const sections = user.departmentId ? await resolveSections(NAV_TREE) : [];
  const hasAnyTiles = sections.some((s) => s.tiles.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader moduleKey="dashboard" title={`Welcome, ${user.name}`} description="Pick up where you left off." />
      {lastLoginBanner}

      {hasAnyTiles ? (
        <div className="space-y-6">
          {sections.map((section, i) => {
            const SectionIcon = section.icon ? MODULE_ICONS[section.icon] : null;
            const sectionTheme = section.icon ? MODULE_THEME[section.icon] : null;
            return (
              <div key={section.label ?? `ungrouped-${i}`} className="space-y-3">
                {section.label ? (
                  <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    {SectionIcon ? <SectionIcon className={cn("size-4", sectionTheme?.text)} /> : null}
                    {section.label}
                  </h2>
                ) : null}
                <TileGrid tiles={section.tiles} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No modules are available for your account yet.</p>
      )}
    </div>
  );
}
