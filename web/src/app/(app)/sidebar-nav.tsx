"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULE_ICONS, MODULE_THEME, type ModuleKey } from "@/lib/module-theme";

export type NavItem = { href: string; label: string; icon: ModuleKey };

export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = MODULE_ICONS[item.icon];
        const theme = MODULE_THEME[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
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
      })}
    </nav>
  );
}
