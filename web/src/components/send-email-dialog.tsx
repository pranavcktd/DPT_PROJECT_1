"use client";

import { useActionState } from "react";
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

export type SendEmailActionState = { error: string | null; success?: boolean };

/**
 * Generic "Send via Email" trigger for any report/certificate. The document
 * itself (PDF or CSV) is generated server-side inside `action` from whatever
 * extra hidden fields are passed as `extraFields` - this component only
 * collects the recipient address.
 */
export function SendEmailDialog({
  action,
  defaultEmail,
  extraFields,
  triggerLabel = "Email",
  size = "default",
}: {
  action: (prev: SendEmailActionState, formData: FormData) => Promise<SendEmailActionState>;
  defaultEmail?: string;
  extraFields?: Record<string, string>;
  triggerLabel?: string;
  size?: "default" | "sm";
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null } as SendEmailActionState);

  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", size })} render={<button type="button" />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send by Email</DialogTitle>
          <DialogDescription>
            {defaultEmail
              ? "The contractor's captured email is pre-filled - you can change it before sending."
              : "Enter the recipient's email address."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {extraFields
            ? Object.entries(extraFields).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)
            : null}
          <Input type="email" name="to" required defaultValue={defaultEmail ?? ""} placeholder="recipient@example.com" />
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-600">Sent successfully.</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
