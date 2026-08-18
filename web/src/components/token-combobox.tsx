"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TokenOption = { token_number: string; token_generated_date: string | null };

/**
 * Treasury token number field with suggestions from this department's own
 * previous token entries (scoped to the same payment type - salary and
 * non-salary tokens are separate pools). Picking a suggestion auto-fills the
 * token generated date from that earlier entry; typing a token that isn't in
 * the list is treated as a new token, left for manual date entry.
 */
export function TokenCombobox({
  tokens,
  value,
  onChange,
  onSelectExisting,
  placeholder = "Enter or search a token number",
}: {
  tokens: TokenOption[];
  value: string;
  onChange: (value: string) => void;
  onSelectExisting: (token: TokenOption) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const filtered = value.trim()
    ? tokens.filter((t) => t.token_number.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 20)
    : tokens.slice(0, 20);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && filtered.length > 0 ? (
        <div className="absolute z-50 mt-1 max-h-48 w-full min-w-64 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {filtered.map((t) => (
            <button
              key={t.token_number}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelectExisting(t);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span className="truncate font-medium">{t.token_number}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{t.token_generated_date ?? "-"}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
