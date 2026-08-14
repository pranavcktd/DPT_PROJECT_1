"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULE_ICONS, MODULE_THEME, type ModuleKey } from "@/lib/module-theme";

export type NavLink = { href: string; label: string; icon: ModuleKey };
export type NavGroup = { label: string; icon: ModuleKey; children: NavLink[] };
export type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

function NavLinkRow({ item, onNavigate, indent }: { item: NavLink; onNavigate?: () => void; indent?: boolean }) {
  const pathname = usePathname();
  const Icon = MODULE_ICONS[item.icon];
  const theme = MODULE_THEME[item.icon];
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        indent && "ml-3",
        active ? theme.navActive : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md",
          active ? "bg-white/20" : theme.badge,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      {item.label}
    </Link>
  );
}

export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        if (isGroup(item)) {
          const Icon = MODULE_ICONS[item.icon];
          return (
            <div key={item.label} className="pt-1">
              <div className="flex items-center gap-2.5 px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <Icon className="size-3.5" />
                {item.label}
              </div>
              <div className="flex flex-col gap-1">
                {item.children.map((child) => (
                  <NavLinkRow key={child.href} item={child} onNavigate={onNavigate} indent />
                ))}
              </div>
            </div>
          );
        }
        return <NavLinkRow key={item.href} item={item} onNavigate={onNavigate} />;
      })}
    </nav>
  );
}
