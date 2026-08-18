import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { IdleLogoutGuard } from "@/components/idle-logout-guard";
import { getModulePermissions, requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { MODULE_REGISTRY_BY_KEY, NAV_TREE, type NavTreeNode } from "@/lib/module-registry";
import { Menu } from "lucide-react";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  DEPARTMENT_ADMIN: "Department Admin",
  EXECUTIVE_ENGINEER: "Executive Engineer / Approver",
  DATA_ENTRY_OPERATOR: "Data Entry Operator",
  AUDITOR: "Auditor / Viewer",
};

const DASHBOARD_NAV_ITEM: NavItem = { href: "/dashboard", label: "Dashboard", icon: "dashboard" };

const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/super-admin/departments", label: "Departments", icon: "superAdmin" },
  { href: "/super-admin/users", label: "Users", icon: "staff" },
  { href: "/super-admin/notices", label: "Notices", icon: "notices" },
  { href: "/super-admin/audit-logs", label: "Audit Logs", icon: "auditLogs" },
  { href: "/super-admin/profile", label: "My Profile", icon: "account" },
];

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Resolves the module/sub-module nav tree against this user's actual
 * per-module permissions - a "link" node disappears if they can't view that
 * module, and a "group" node disappears entirely if none of its children
 * (recursively) are visible, rather than rendering an empty group.
 */
async function resolveNavTree(nodes: NavTreeNode[]): Promise<NavItem[]> {
  const resolved = await Promise.all(
    nodes.map(async (node): Promise<NavItem | null> => {
      if (node.type === "link") {
        const entry = MODULE_REGISTRY_BY_KEY[node.key];
        if (!entry) return null;
        const { can_view } = await getModulePermissions(entry.moduleCode);
        return can_view ? { href: entry.href, label: entry.navLabel, icon: entry.key } : null;
      }
      if (node.type === "link-custom") {
        const permissions = await Promise.all(node.requiresAnyView.map((code) => getModulePermissions(code)));
        const visible = permissions.some((p) => p.can_view);
        return visible ? { href: node.href, label: node.label, icon: node.icon } : null;
      }
      const children = await resolveNavTree(node.children);
      return children.length > 0 ? { label: node.label, icon: node.icon, children } : null;
    }),
  );
  return resolved.filter((item): item is NavItem => item !== null);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const department = user.departmentId
    ? await db.departments.findUnique({
        where: { id: BigInt(user.departmentId) },
        select: { department_name: true, tenant_code: true, logo_path: true },
      })
    : null;

  const navItems: NavItem[] =
    user.roleCode === "SUPER_ADMIN"
      ? SUPER_ADMIN_NAV_ITEMS
      : [DASHBOARD_NAV_ITEM, ...(await resolveNavTree(NAV_TREE))];

  const brand = (
    <div className="flex items-center gap-2.5 px-1">
      {department?.logo_path ? (
        <Image
          src={department.logo_path}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-md border object-contain"
        />
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          {department ? initials(department.department_name) : "SA"}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-heading truncate text-sm font-semibold leading-tight">
          {department ? department.department_name : "Software Company"}
        </p>
        <p className="text-xs text-muted-foreground">{department ? department.tenant_code : "Super Admin"}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-svh overflow-hidden">
      <IdleLogoutGuard />
      <aside className="no-print hidden w-64 shrink-0 flex-col gap-4 border-r bg-background p-4 md:flex">
        {brand}
        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={navItems} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="no-print flex items-center gap-3 border-b bg-background px-4 py-3">
          <Sheet>
            {/* Plain <button> + buttonVariants (not <Button>) - nesting a component that
                sets its own data-slot inside an eagerly SSR-rendered trigger's render prop
                causes a server/client hydration mismatch on the data-slot attribute. */}
            <SheetTrigger
              className={buttonVariants({ variant: "ghost", size: "icon" }) + " md:hidden"}
              render={<button type="button" />}
            >
              <Menu />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-4 p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {brand}
              <div className="flex-1 overflow-y-auto">
                <SidebarNav items={navItems} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex items-center gap-3">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {ROLE_LABELS[user.roleCode] ?? user.roleCode}
            </Badge>
            <UserMenu name={user.name ?? ""} roleLabel={ROLE_LABELS[user.roleCode] ?? user.roleCode} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/20 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
