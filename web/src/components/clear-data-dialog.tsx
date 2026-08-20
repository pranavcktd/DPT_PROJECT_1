"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";

export type ClearDataState = {
  error: string | null;
  success?: boolean;
  backupBase64?: string;
  filename?: string;
  emailSent?: boolean;
  deletedCounts?: Record<string, number>;
};

function downloadBase64Zip(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Wipes a department's module data (contractors/employees/schemes/works/
 * payments/salary payments/certificates) - keeps the department, staff
 * logins, and settings intact. Always backs up first: the same action both
 * emails the backup (best effort) and hands it back here for an immediate
 * browser download, so the safety net doesn't depend on email working.
 */
export function ClearDataDialog({
  tenantCode,
  departmentName,
  notifyEmail,
  action,
}: {
  tenantCode: string;
  departmentName: string;
  notifyEmail: string;
  action: (confirmTenantCode: string) => Promise<ClearDataState>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ClearDataState | null>(null);

  async function handleConfirm() {
    setIsSubmitting(true);
    const state = await action(confirmText);
    setIsSubmitting(false);
    setResult(state);
    if (state.success && state.backupBase64 && state.filename) {
      downloadBase64Zip(state.backupBase64, state.filename);
      router.refresh();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setConfirmText("");
          setResult(null);
        }
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "destructive", size: "sm" })} render={<button type="button" />}>
        Clear All Data
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clear all data for {departmentName}?</DialogTitle>
          <DialogDescription>
            Permanently deletes every contractor, employee, scheme, work order, payment, salary payment, and
            certificate in this department. The department itself, staff logins, and settings are kept. A full backup
            is taken automatically first - emailed to <strong>{notifyEmail}</strong> if SMTP is configured, and also
            downloaded to this browser immediately so you can restore from it if this was a mistake. This cannot be
            undone directly - only by restoring that backup. Type the tenant code{" "}
            <span className="font-mono font-medium">{tenantCode}</span> to confirm.
          </DialogDescription>
        </DialogHeader>

        {!result?.success ? (
          <>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={tenantCode} />
            {result?.error ? <p className="text-sm text-destructive">{result.error}</p> : null}
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isSubmitting || confirmText.trim().toUpperCase() !== tenantCode.toUpperCase()}
              >
                {isSubmitting ? "Backing up and clearing..." : "Permanently Clear All Data"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-emerald-600">All data cleared. A backup was downloaded to this browser{result.emailSent ? ` and emailed to ${notifyEmail}` : ""}.</p>
            {result.deletedCounts ? (
              <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                {Object.entries(result.deletedCounts).map(([label, count]) => (
                  <li key={label}>
                    {label}: {count} deleted
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
