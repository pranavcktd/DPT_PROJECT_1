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
import { onboardDepartment } from "./actions";
import { DEFAULT_PASSWORD } from "@/lib/auth-constants";
import { onboardDepartmentSchema, type OnboardDepartmentInput, type OnboardDepartmentValues } from "./schema";

export function DepartmentFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<OnboardDepartmentInput, unknown, OnboardDepartmentValues>({
    resolver: zodResolver(onboardDepartmentSchema),
    defaultValues: {
      department_name: "",
      tenant_code: "",
      official_email: "",
      office_address: "",
      district: "",
      state: "",
      gstin: "",
      pan: "",
      contact_number: "",
      subscription_amount: "",
      subscription_start_date: "",
      subscription_days: "",
    },
  });

  async function onSubmit(values: OnboardDepartmentValues) {
    setServerError(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, String(value ?? "")));

    const result = await onboardDepartment({ error: null }, formData);
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
        className={buttonVariants({ variant: "default" }) + " bg-fuchsia-600 text-white hover:bg-fuchsia-700"}
        render={<button type="button" />}
      >
        Onboard Department
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Onboard Department</DialogTitle>
          <DialogDescription>
            Creates the department profile and its first Department Admin login. The admin&apos;s email is the official
            email below, and the default password is <span className="font-mono font-medium">{DEFAULT_PASSWORD}</span> -
            they change it via Change Password after logging in.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="department_name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Department Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Public Works Department" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tenant_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="PWD-KA" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="official_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Official Email (Admin login)</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="pwd@state.gov.in" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gstin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GSTIN</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="29AAAAA0000A1Z5" maxLength={15} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PAN</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="AAAAA0000A" maxLength={10} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="office_address"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Office Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="sm:col-span-2 border-t pt-4">
              <p className="mb-1 text-sm font-medium">Subscription (optional - can be set later)</p>
              <p className="text-xs text-muted-foreground">Leave blank for an unmetered/trial department.</p>
            </div>
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

            {serverError ? <p className="text-sm text-destructive sm:col-span-2">{serverError}</p> : null}

            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-fuchsia-600 text-white hover:bg-fuchsia-700">
                {form.formState.isSubmitting ? "Onboarding..." : "Onboard Department"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
