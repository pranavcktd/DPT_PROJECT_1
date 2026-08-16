"use client";

import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** Triggers the browser's native print dialog - "Save as PDF" is one of its destinations. */
export function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonVariants({ variant: "outline" }) + " " + (className ?? "")}
    >
      <Printer className="size-4" />
      Print / Save PDF
    </button>
  );
}
