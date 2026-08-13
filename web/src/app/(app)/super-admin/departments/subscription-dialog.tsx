"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateSubscription } from "./actions";
import { subscriptionSchema, type SubscriptionInput, type SubscriptionValues } from "./schema";

function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function SubscriptionDialog({
  departmentId,
  departmentName,
  subscription,
}: {
  departmentId: string;
  departmentName: string;
  subscription: { amount: number | null; startDate: string | null; days: number | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SubscriptionInput, unknown, SubscriptionValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      subscription_amount: subscription.amount ?? "",
      subscription_start_date: toDateInputValue(subscription.startDate),
      subscription_days: subscription.days ?? "",
    },
  });

  async function onSubmit(values: SubscriptionValues) {
    setServerError(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, String(value ?? "")));

    const result = await updateSubscription(departmentId, { error: null }, formData);
    if (result.error) {
      setServerError(result.error);
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
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })} render={<button type="button" />}>
        Subscription
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Subscription - {departmentName}</DialogTitle>
          <DialogDescription>
            The end date is computed automatically from the start date + number of days. Leave fields blank for an
            unmetered/trial department.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="subscription_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      value={typeof field.value === "number" ? field.value : String(field.value ?? "")}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subscription_start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subscription_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Days</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      value={typeof field.value === "number" ? field.value : String(field.value ?? "")}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Subscription"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
