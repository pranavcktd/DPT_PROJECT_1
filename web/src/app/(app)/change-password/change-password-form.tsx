"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { changePasswordSchema, type ChangePasswordValues } from "./schema";
import { changePassword } from "./actions";

export function ChangePasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setServerError(null);
    setSuccessMessage(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value ?? ""));

    const result = await changePassword({ error: null }, formData);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setSuccessMessage("Password changed successfully.");
    form.reset();
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Use this to set your own password after your first login, or any time you want to update it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

            <div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Change Password"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
