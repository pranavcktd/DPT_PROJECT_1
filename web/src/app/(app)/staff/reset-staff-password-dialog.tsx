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
import { DEFAULT_PASSWORD } from "@/lib/auth-constants";
import { resetStaffPassword } from "./actions";

export function ResetStaffPasswordDialog({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didReset, setDidReset] = useState(false);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    const result = await resetStaffPassword(userId);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDidReset(true);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setDidReset(false);
        }
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })} render={<button type="button" />}>
        Reset Password
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password - {name}</DialogTitle>
          <DialogDescription>
            Resets this account&apos;s password back to the default{" "}
            <span className="font-mono font-medium">{DEFAULT_PASSWORD}</span>. They&apos;ll be required to change it
            the next time they log in.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {didReset ? (
          <p className="text-sm text-emerald-600">
            Password reset to <span className="font-mono font-medium">{DEFAULT_PASSWORD}</span>. Share it with them
            out of band.
          </p>
        ) : null}
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={isSubmitting || didReset}>
            {isSubmitting ? "Resetting..." : "Confirm Reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
