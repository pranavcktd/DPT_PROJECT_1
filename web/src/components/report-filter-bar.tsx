"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLiveSearchParams } from "@/hooks/use-live-search-params";

export type ReportFilterField =
  | { type: "text"; name: string; label: string; placeholder?: string }
  | { type: "date"; name: string; label: string }
  | { type: "select"; name: string; label: string; defaultValue: string; options: { value: string; label: string }[] };

const FIELD_CLASS = "h-9 rounded-md border bg-background px-3 text-sm";

/**
 * Live, type-to-filter replacement for the old <form method="get"> + Apply
 * button report filters - updates the URL's searchParams via router.replace
 * (debounced for text, instant for select/date) so the Server Component
 * re-renders without a full navigation. Export links stay server-rendered
 * elsewhere, reading whatever's currently in searchParams.
 */
export function ReportFilterBar({ fields }: { fields: ReportFilterField[] }) {
  const defaults = Object.fromEntries(
    fields.map((f) => [f.name, f.type === "select" ? f.defaultValue : ""])
  ) as Record<string, string>;

  const { values, setValue, reset, isPending } = useLiveSearchParams(defaults);

  return (
    <div className="flex flex-wrap items-end gap-3">
      {fields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
          </label>
          {field.type === "select" ? (
            <select
              id={field.name}
              value={values[field.name]}
              onChange={(e) => setValue(field.name, e.target.value, 0)}
              className={FIELD_CLASS}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={field.name}
              type={field.type === "date" ? "date" : "text"}
              value={values[field.name]}
              onChange={(e) => setValue(field.name, e.target.value, field.type === "date" ? 0 : 300)}
              placeholder={field.type === "text" ? field.placeholder : undefined}
              className={cn(FIELD_CLASS, field.type === "text" && "w-64")}
            />
          )}
        </div>
      ))}
      <button type="button" onClick={reset} className={buttonVariants({ variant: "ghost" })}>
        Reset
      </button>
      {isPending ? <span className="self-center text-xs text-muted-foreground">Filtering…</span> : null}
    </div>
  );
}
