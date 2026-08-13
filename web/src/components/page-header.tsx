import { cn } from "@/lib/utils";
import { MODULE_ICONS, MODULE_THEME, type ModuleKey } from "@/lib/module-theme";

export function PageHeader({
  moduleKey,
  title,
  description,
  action,
}: {
  moduleKey: ModuleKey;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const Icon = MODULE_ICONS[moduleKey];
  const theme = MODULE_THEME[moduleKey];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", theme.badge)}>
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
