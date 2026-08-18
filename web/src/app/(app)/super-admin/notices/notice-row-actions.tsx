"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteNotice, setNoticeActive } from "./actions";

export function ToggleNoticeActiveButton({ noticeId, isActive }: { noticeId: string; isActive: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    await setNoticeActive(noticeId, !isActive);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isSubmitting}>
      {isSubmitting ? "Saving..." : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}

export function DeleteNoticeDialog({ noticeId, title }: { noticeId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);
    await deleteNotice(noticeId);
    setIsSubmitting(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "destructive", size: "sm" })} render={<button type="button" />}>
        Delete
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete notice &quot;{title}&quot;?</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Deleting..." : "Permanently Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
