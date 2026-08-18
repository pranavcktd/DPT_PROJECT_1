"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
} from "@/components/ui/combobox";

export type PartyOption = { id: string; label: string; sublabel?: string };

/**
 * Search-to-select party picker (contractor/employee) with an "Add new"
 * fallback when the party being typed doesn't exist yet - opens a quick-add
 * popup instead of forcing a trip to the Contractors/Employees page.
 */
export function PartyCombobox({
  items,
  value,
  onValueChange,
  placeholder,
  addNewLabel,
  renderAddDialog,
}: {
  items: PartyOption[];
  value: string;
  onValueChange: (id: string) => void;
  placeholder: string;
  addNewLabel: string;
  renderAddDialog: (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (id: string) => void;
  }) => React.ReactNode;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const selected = items.find((item) => item.id === value) ?? null;

  return (
    <>
      <Combobox
        items={items}
        value={selected}
        onValueChange={(next) => onValueChange(next ? (next as PartyOption).id : "")}
        itemToStringLabel={(item) => (item as PartyOption).label}
      >
        <ComboboxInputGroup>
          <ComboboxInput placeholder={placeholder} />
          <ComboboxClear />
          <ComboboxIcon />
        </ComboboxInputGroup>
        <ComboboxContent
          empty={<ComboboxEmpty>No match - use &quot;{addNewLabel}&quot; below.</ComboboxEmpty>}
          footer={
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex w-full items-center gap-1.5 rounded-md border-t px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent"
            >
              <PlusIcon className="size-3.5" />
              {addNewLabel}
            </button>
          }
        >
          {(item: PartyOption) => (
            <ComboboxItem key={item.id} value={item}>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.label}</span>
                {item.sublabel ? <span className="block truncate text-xs text-muted-foreground">{item.sublabel}</span> : null}
              </span>
            </ComboboxItem>
          )}
        </ComboboxContent>
      </Combobox>

      {renderAddDialog({
        open: addOpen,
        onOpenChange: setAddOpen,
        onCreated: (id) => {
          onValueChange(id);
          setAddOpen(false);
        },
      })}
    </>
  );
}
