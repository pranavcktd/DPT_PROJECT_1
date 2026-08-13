"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ddoFormSchema, type DdoFormValues } from "./schema";
import { upsertDdo } from "./actions";

export function DdoForm({ ddo }: { ddo: DdoFormValues }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<DdoFormValues>({
    resolver: zodResolver(ddoFormSchema),
    defaultValues: ddo,
  });

  async function onSubmit(values: DdoFormValues) {
    setServerError(null);
    setSuccessMessage(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value ?? ""));

    const result = await upsertDdo({ error: null }, formData);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setSuccessMessage("DDO details saved.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drawing &amp; Disbursing Officer (DDO)</CardTitle>
        <CardDescription>Appears on payment certificates as the signing authority.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="ddo_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DDO Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Executive Engineer" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ddo_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DDO Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="treasury_registration_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treasury Registration Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? <p className="text-sm text-destructive sm:col-span-2">{serverError}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-600 sm:col-span-2">{successMessage}</p> : null}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save DDO Details"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
