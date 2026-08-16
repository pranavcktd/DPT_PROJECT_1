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

export type ImportActionState = { error: string | null; summary?: ImportSummary };

export function CsvImportDialog({
  title,
  description,
  templateHref,
  action,
}: {
  title: string;
  description: string;
  templateHref: string;
  action: (prev: ImportActionState, formData: FormData) => Promise<ImportActionState>;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, { error: null } as ImportActionState);

  useEffect(() => {
    if (state.summary && state.summary.created > 0) router.refresh();
  }, [state.summary, router]);

  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline" })} render={<button type="button" />}>
        Import
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <a href={templateHref} className={buttonVariants({ variant: "secondary", size: "sm" }) + " w-fit"}>
          Download Template
        </a>

        <form action={formAction} className="space-y-4">
          <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm" />

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          {state.summary ? (
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <p>
                {state.summary.created} of {state.summary.totalRows} row{state.summary.totalRows === 1 ? "" : "s"} imported successfully.
              </p>
              {state.summary.failed.length > 0 ? (
                <div className="max-h-40 overflow-y-auto">
                  <p className="font-medium text-destructive">Failed rows:</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-destructive">
                    {state.summary.failed.map((f) => (
                      <li key={f.row}>
                        Row {f.row}: {f.error}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Importing..." : "Upload & Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
