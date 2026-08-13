"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, buttonVariants, type ButtonVariant, type ButtonSize } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatEnumLabel } from "@/lib/utils";
import { workFormSchema, type WorkFormValues, type WorkFormInput } from "./schema";
import { createWork, updateWork } from "./actions";

type WorkRecord = WorkFormValues & { id: string };
type SchemeOption = { id: string; scheme_name: string; remaining: number };

function toDateInputValue(value?: string) {
  return value ? value.slice(0, 10) : "";
}

export function WorkFormDialog({
  work,
  schemes,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
}: {
  work?: WorkRecord;
  schemes: SchemeOption[];
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!work;

  const form = useForm<WorkFormInput, unknown, WorkFormValues>({
    resolver: zodResolver(workFormSchema),
    defaultValues: work
      ? {
          ...work,
          expected_completion_date: toDateInputValue(work.expected_completion_date),
          actual_completion_date: toDateInputValue(work.actual_completion_date),
        }
      : {
          scheme_id: "",
          work_name: "",
          sanctioned_cost: 0,
          expected_completion_date: "",
          actual_completion_date: "",
          status: "ONGOING",
        },
  });

  const selectedSchemeId = form.watch("scheme_id");
  const selectedScheme = schemes.find((s) => s.id === selectedSchemeId);
  // When editing, this work order's own sanctioned cost is already counted in
  // "remaining" as a deduction; add it back so the hint reflects what's free
  // excluding this record's own allocation.
  const remainingForHint =
    selectedScheme && isEdit && work.scheme_id === selectedSchemeId
      ? selectedScheme.remaining + Number(work.sanctioned_cost)
      : selectedScheme?.remaining;

  async function onSubmit(values: WorkFormValues) {
    setServerError(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, String(value ?? "")));

    const result = isEdit
      ? await updateWork(work.id, { error: null }, formData)
      : await createWork({ error: null }, formData);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
    form.reset();
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
      <DialogTrigger
        className={cn(buttonVariants({ variant: triggerVariant, size: triggerSize }), triggerClassName)}
        render={<button type="button" />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Work Order" : "New Work Order"}</DialogTitle>
          <DialogDescription>
            Contractor and agreement details are captured later, during Payment Entry - not here.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="scheme_id"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Scheme</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a scheme">
                          {(v: string) => schemes.find((s) => s.id === v)?.scheme_name}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {schemes.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.scheme_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {remainingForHint !== undefined ? (
                    <p className={`text-xs ${remainingForHint < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      Remaining budget: ₹{remainingForHint.toLocaleString("en-IN")}
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="work_name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Work Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sanctioned_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sanctioned Cost (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      disabled={field.disabled}
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{(v: string) => formatEnumLabel(v)}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ONGOING">Ongoing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="TERMINATED">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expected_completion_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Completion</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actual_completion_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Completion</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? <p className="text-sm text-destructive sm:col-span-2">{serverError}</p> : null}

            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create work order"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
