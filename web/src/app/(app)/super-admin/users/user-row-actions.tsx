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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_PASSWORD } from "@/lib/auth-constants";
import { formatEnumLabel } from "@/lib/utils";
import { resetUserPassword, setUserStatus } from "./actions";

export function ResetUserPasswordDialog({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didReset, setDidReset] = useState(false);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    const result = await resetUserPassword(userId);
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
            the next time they log in. Use this when the account holder (including a Department Admin) can&apos;t
            reach anyone within their own department to reset it for them.
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

const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export function ChangeUserStatusDialog({
  userId,
  name,
  status,
}: {
  userId: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<(typeof STATUSES)[number]>(status);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    const result = await setUserStatus(userId, nextStatus);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setNextStatus(status);
        }
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })} render={<button type="button" />}>
        Change Status
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Status - {name}</DialogTitle>
          <DialogDescription>
            Suspending or deactivating blocks this account from logging in immediately. Use this when a department
            can&apos;t act on their own account (e.g. their Department Admin is locked out).
          </DialogDescription>
        </DialogHeader>
        <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as (typeof STATUSES)[number])}>
          <SelectTrigger className="w-full">
            <SelectValue>{(v: string) => formatEnumLabel(v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {formatEnumLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={isSubmitting || nextStatus === status}>
            {isSubmitting ? "Saving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
