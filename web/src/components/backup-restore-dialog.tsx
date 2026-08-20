"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ImportSummary } from "@/lib/csv-import";

export type BackupRestoreState = { error: string | null; summary?: Record<string, ImportSummary> };

/**
 * Restores a full department backup zip (see src/lib/backup.ts) - shows a
 * per-sheet summary (Contractors, Employees, ...) rather than the single
 * summary CsvImportDialog shows, since one zip covers several modules at once.
 */
export function BackupRestoreDialog({
  triggerLabel = "Restore from Backup",
  description,
  action,
}: {
  triggerLabel?: string;
  description: string;
  action: (prev: BackupRestoreState, formData: FormData) => Promise<BackupRestoreState>;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, { error: null } as BackupRestoreState);

  useEffect(() => {
    if (state.summary && Object.values(state.summary).some((s) => s.created > 0)) router.refresh();
  }, [state.summary, router]);

  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline" })} render={<button type="button" />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Restore from Backup</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="file" name="file" accept=".zip,application/zip" required className="block w-full text-sm" />

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          {state.summary ? (
            <div className="space-y-3 rounded-lg border p-3 text-sm">
              {Object.entries(state.summary).map(([label, summary]) => (
                <div key={label} className="space-y-1">
                  <p className="font-medium">
                    {label}: {summary.created} of {summary.totalRows} row{summary.totalRows === 1 ? "" : "s"} restored.
                  </p>
                  {summary.failed.length > 0 ? (
                    <ul className="max-h-24 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-destructive">
                      {summary.failed.map((f) => (
                        <li key={f.row}>
                          Row {f.row}: {f.error}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Restoring..." : "Upload & Restore"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
