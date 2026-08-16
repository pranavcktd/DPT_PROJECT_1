"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { signOutAction } from "@/app/(app)/dashboard/actions";

export function SignOutDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({ variant: "ghost", size: "sm" })}
        render={<button type="button" />}
      >
        Sign out
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign out?</DialogTitle>
          <DialogDescription>You will need to sign in again to access your account.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <form action={signOutAction}>
            <Button type="submit" variant="destructive" className="w-full">
              Sign out
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
