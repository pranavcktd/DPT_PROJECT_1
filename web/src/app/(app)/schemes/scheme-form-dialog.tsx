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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatEnumLabel } from "@/lib/utils";
import { schemeFormSchema, type SchemeFormValues, type SchemeFormInput } from "./schema";
import { createScheme, updateScheme } from "./actions";

type SchemeRecord = SchemeFormValues & { id: string };

export function SchemeFormDialog({
  scheme,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
}: {
  scheme?: SchemeRecord;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!scheme;

  const form = useForm<SchemeFormInput, unknown, SchemeFormValues>({
    resolver: zodResolver(schemeFormSchema),
    defaultValues: scheme ?? {
      scheme_name: "",
      financial_year: "",
      sanctioned_budget: 0,
      description: "",
      status: "ACTIVE",
    },
  });

  async function onSubmit(values: SchemeFormValues) {
    setServerError(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, String(value ?? "")));

    const result = isEdit
      ? await updateScheme(scheme.id, { error: null }, formData)
      : await createScheme({ error: null }, formData);

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
          <DialogTitle>{isEdit ? "Edit Scheme" : "New Scheme"}</DialogTitle>
          <DialogDescription>
            The sanctioned budget is the hard ceiling for total work orders raised under this scheme.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="scheme_name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Scheme Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="financial_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Financial Year</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="2025-2026" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sanctioned_budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sanctioned Budget (₹)</FormLabel>
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
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? <p className="text-sm text-destructive sm:col-span-2">{serverError}</p> : null}

            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create scheme"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
