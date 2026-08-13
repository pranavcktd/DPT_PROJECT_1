import Image from "next/image";
import Link from "next/link";
import { KeyRound, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getModulePermissions, requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { signOutAction } from "./dashboard/actions";
import { SidebarNav, type NavItem } from "./sidebar-nav";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  DEPARTMENT_ADMIN: "Department Admin",
  EXECUTIVE_ENGINEER: "Executive Engineer / Approver",
  DATA_ENTRY_OPERATOR: "Data Entry Operator",
  AUDITOR: "Auditor / Viewer",
};

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/contractors", label: "Contractors", icon: "contractors" },
  { href: "/schemes", label: "Schemes", icon: "schemes" },
  { href: "/works", label: "Works", icon: "works" },
  { href: "/payments", label: "Payments", icon: "payments" },
  { href: "/certificates", label: "Certificates", icon: "certificates" },
];

const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/super-admin/departments", label: "Departments", icon: "superAdmin" },
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

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const department = user.departmentId
    ? await db.departments.findUnique({
        where: { id: BigInt(user.departmentId) },
        select: { department_name: true, tenant_code: true, logo_path: true },
      })
    : null;

  const canViewDepartmentSettings = user.departmentId
    ? (await getModulePermissions("DEPARTMENT_SETTINGS")).can_view
    : false;

  const navItems: NavItem[] =
    user.roleCode === "SUPER_ADMIN"
      ? SUPER_ADMIN_NAV_ITEMS
      : [
          ...BASE_NAV_ITEMS,
          ...(canViewDepartmentSettings
            ? [{ href: "/department", label: "Department Profile", icon: "department" as const }]
            : []),
        ];

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
        <p className="truncate text-sm font-semibold leading-tight">
          {department ? department.department_name : "Software Company"}
        </p>
        <p className="text-xs text-muted-foreground">{department ? department.tenant_code : "Super Admin"}</p>
      </div>
    </div>
  );

  const userFooter = (
    <div className="space-y-1.5 rounded-lg border bg-muted/30 p-2.5">
      <div className="flex items-center gap-2.5">
        <Avatar size="sm">
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.roleCode] ?? user.roleCode}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          href="/change-password"
          className={buttonVariants({ variant: "ghost", size: "sm" }) + " flex-1 justify-start gap-1.5"}
        >
          <KeyRound className="size-3.5" />
          Change Password
        </Link>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-64 shrink-0 flex-col gap-4 border-r bg-background p-4 md:flex">
        {brand}
        <SidebarNav items={navItems} />
        <div className="mt-auto">{userFooter}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 md:hidden">
          <Sheet>
            {/* Plain <button> + buttonVariants (not <Button>) - nesting a component that
                sets its own data-slot inside an eagerly SSR-rendered trigger's render prop
                causes a server/client hydration mismatch on the data-slot attribute. */}
            <SheetTrigger className={buttonVariants({ variant: "ghost", size: "icon" })} render={<button type="button" />}>
              <Menu />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-4 p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {brand}
              <SidebarNav items={navItems} />
              <div className="mt-auto">{userFooter}</div>
            </SheetContent>
          </Sheet>
          <Badge variant="secondary">{ROLE_LABELS[user.roleCode] ?? user.roleCode}</Badge>
        </header>

        <main className="flex-1 bg-muted/20 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
