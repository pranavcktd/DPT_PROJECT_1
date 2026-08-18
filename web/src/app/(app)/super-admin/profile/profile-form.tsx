"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { superAdminProfileSchema, type SuperAdminProfileValues } from "./schema";
import { updateSuperAdminProfile } from "./actions";

export function SuperAdminProfileForm({ profile }: { profile: SuperAdminProfileValues & { email: string } }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<SuperAdminProfileValues>({
    resolver: zodResolver(superAdminProfileSchema),
    defaultValues: { name: profile.name, phone: profile.phone },
  });

  async function onSubmit(values: SuperAdminProfileValues) {
    setServerError(null);
    setSuccessMessage(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value ?? ""));

    const result = await updateSuperAdminProfile({ error: null }, formData);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setSuccessMessage("Profile updated.");
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>
          Shown to any department user whose login is blocked (disabled department or expired subscription), so they
          know who to contact.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. +91 98765 43210" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-1.5">
              <FormLabel>Email</FormLabel>
              <Input value={profile.email} disabled readOnly />
              <p className="text-xs text-muted-foreground">Email is your login ID and can&apos;t be changed here.</p>
            </div>

            {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

            <div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
