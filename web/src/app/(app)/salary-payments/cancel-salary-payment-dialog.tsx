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
import { Textarea } from "@/components/ui/textarea";
import { cancelSalaryPayment } from "./actions";

export function CancelSalaryPaymentDialog({ paymentId, employeeName }: { paymentId: string; employeeName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCancel() {
    setError(null);
    setIsSubmitting(true);
    const result = await cancelSalaryPayment(paymentId, reason);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setReason("");
        }
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "destructive", size: "sm" })} render={<button type="button" />}>
        Cancel
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Payment - {employeeName}</DialogTitle>
          <DialogDescription>
            This marks the payment as cancelled. A reason is required for the audit trail - this cannot be undone from
            the UI.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation"
          rows={3}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
