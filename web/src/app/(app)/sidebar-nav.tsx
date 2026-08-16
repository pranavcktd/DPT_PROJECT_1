"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULE_ICONS, MODULE_THEME, type ModuleKey } from "@/lib/module-theme";

export type NavLink = { href: string; label: string; icon: ModuleKey };
export type NavGroup = { label: string; icon: ModuleKey; children: NavItem[] };
export type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

function hasActiveDescendant(item: NavGroup, pathname: string): boolean {
  return item.children.some((child) =>
    isGroup(child)
      ? hasActiveDescendant(child, pathname)
      : pathname === child.href || pathname.startsWith(`${child.href}/`),
  );
}

function NavLinkRow({ item, onNavigate, depth }: { item: NavLink; onNavigate?: () => void; depth: number }) {
  const pathname = usePathname();
  const Icon = MODULE_ICONS[item.icon];
  const theme = MODULE_THEME[item.icon];
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      style={depth > 0 ? { paddingLeft: `${depth * 0.75 + 0.625}rem` } : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active ? theme.navActive : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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

function NavGroupRow({ item, onNavigate, depth }: { item: NavGroup; onNavigate?: () => void; depth: number }) {
  const pathname = usePathname();
  const Icon = MODULE_ICONS[item.icon];
  const theme = MODULE_THEME[item.icon];
  // Groups start open so the whole module -> sub-module workflow is visible
  // immediately, per the "easy and immediate" navigation request - collapse
  // is available but not the default.
  const [open, setOpen] = useState(true);
  const childActive = hasActiveDescendant(item, pathname);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={depth > 0 ? { paddingLeft: `${depth * 0.75 + 0.625}rem` } : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          childActive ? theme.text : "text-foreground hover:bg-sidebar-accent",
        )}
      >
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", theme.badge)}>
          <Icon className="size-3.5" />
        </span>
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", open ? "rotate-0" : "-rotate-90")} />
      </button>
      {open ? (
        <div className="flex flex-col gap-1 pt-1">
          {item.children.map((child) => (
            <NavItemRow key={isGroup(child) ? child.label : child.href} item={child} onNavigate={onNavigate} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavItemRow({ item, onNavigate, depth }: { item: NavItem; onNavigate?: () => void; depth: number }) {
  return isGroup(item) ? (
    <NavGroupRow item={item} onNavigate={onNavigate} depth={depth} />
  ) : (
    <NavLinkRow item={item} onNavigate={onNavigate} depth={depth} />
  );
}

export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavItemRow key={isGroup(item) ? item.label : item.href} item={item} onNavigate={onNavigate} depth={0} />
      ))}
    </nav>
  );
}
