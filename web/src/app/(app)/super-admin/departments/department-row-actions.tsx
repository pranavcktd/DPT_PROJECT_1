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
import { deleteDepartment, resetDepartmentAdminPassword, setDepartmentStatus } from "./actions";
import { DEFAULT_PASSWORD } from "./constants";

export function ToggleStatusDialog({
  departmentId,
  departmentName,
  status,
}: {
  departmentId: string;
  departmentName: string;
  status: "ACTIVE" | "INACTIVE";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    const result = await setDepartmentStatus(departmentId, nextStatus);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger
        className={buttonVariants({ variant: status === "ACTIVE" ? "outline" : "default", size: "sm" })}
        render={<button type="button" />}
      >
        {status === "ACTIVE" ? "Disable" : "Enable"}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === "ACTIVE" ? "Disable" : "Enable"} {departmentName}
          </DialogTitle>
          <DialogDescription>
            {status === "ACTIVE"
              ? "Blocks every user in this department from logging in, effective immediately. Their data is kept as-is."
              : "Restores login access for every user in this department."}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button
            variant={status === "ACTIVE" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : status === "ACTIVE" ? "Confirm Disable" : "Confirm Enable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordDialog({ departmentId, departmentName }: { departmentId: string; departmentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    const result = await resetDepartmentAdminPassword(departmentId);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setDone(false);
        }
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })} render={<button type="button" />}>
        Reset Password
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password - {departmentName}</DialogTitle>
          <DialogDescription>
            Resets the Department Admin&apos;s password back to the default{" "}
            <span className="font-mono font-medium">{DEFAULT_PASSWORD}</span>. Share it with them out of band - they
            should change it via Change Password on next login.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {done ? <p className="text-sm text-emerald-600">Password reset to the default.</p> : null}
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={isSubmitting || done}>
            {isSubmitting ? "Resetting..." : "Confirm Reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDepartmentDialog({ departmentId, tenantCode }: { departmentId: string; tenantCode: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    const result = await deleteDepartment(departmentId, confirmText);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setConfirmText("");
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setConfirmText("");
        }
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "destructive", size: "sm" })} render={<button type="button" />}>
        Delete
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete department permanently?</DialogTitle>
          <DialogDescription>
            This permanently deletes {tenantCode} and every contractor, scheme, work order, payment, certificate, and
            user account under it. This cannot be undone. Type the tenant code{" "}
            <span className="font-mono font-medium">{tenantCode}</span> to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={tenantCode} />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || confirmText.trim().toUpperCase() !== tenantCode.toUpperCase()}
          >
            {isSubmitting ? "Deleting..." : "Permanently Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
