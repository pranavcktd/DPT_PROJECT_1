"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { smtpSettingsFormSchema, type SmtpSettingsFormInput, type SmtpSettingsFormValues } from "./smtp-schema";
import { upsertSmtpSettings, sendTestEmail } from "./smtp-actions";

type ExistingSmtp = {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_from_email: string;
  smtp_from_name: string;
  use_tls: boolean;
  isConfigured: boolean;
};

export function SmtpSettingsForm({ smtp }: { smtp: ExistingSmtp }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [testState, setTestState] = useState<{ pending: boolean; message: string | null; error: boolean }>({
    pending: false,
    message: null,
    error: false,
  });

  const form = useForm<SmtpSettingsFormInput, unknown, SmtpSettingsFormValues>({
    resolver: zodResolver(smtpSettingsFormSchema),
    defaultValues: {
      smtp_host: smtp.smtp_host,
      smtp_port: smtp.smtp_port,
      smtp_username: smtp.smtp_username,
      smtp_password: "",
      smtp_from_email: smtp.smtp_from_email,
      smtp_from_name: smtp.smtp_from_name,
      use_tls: smtp.use_tls,
    },
  });

  async function onSubmit(values: SmtpSettingsFormValues) {
    setServerError(null);
    setSuccessMessage(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, String(value ?? "")));

    const result = await upsertSmtpSettings({ error: null }, formData);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setSuccessMessage("SMTP settings saved.");
    form.setValue("smtp_password", "");
  }

  async function handleTestEmail() {
    setTestState({ pending: true, message: null, error: false });
    const result = await sendTestEmail({ error: null });
    setTestState({
      pending: false,
      message: result.error ?? "Test email sent - check the inbox for your account's email.",
      error: !!result.error,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email (SMTP) Settings</CardTitle>
        <CardDescription>
          Used to send reports and certificates by email. {smtp.isConfigured ? "Currently configured." : "Not configured yet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="smtp_host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMTP Host</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="smtp.gmail.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtp_port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
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
              name="smtp_username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMTP Username</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtp_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMTP Password {smtp.isConfigured ? "(leave blank to keep current)" : ""}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtp_from_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="smtp_from_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Department Name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="use_tls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Security</FormLabel>
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(v === "true")}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{(v: string) => (v === "true" ? "STARTTLS" : "None")}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">STARTTLS (recommended, port 587)</SelectItem>
                      <SelectItem value="false">None / implicit TLS (port 465)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? <p className="text-sm text-destructive sm:col-span-2">{serverError}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-600 sm:col-span-2">{successMessage}</p> : null}

            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save SMTP Settings"}
              </Button>
              {smtp.isConfigured ? (
                <Button type="button" variant="outline" onClick={handleTestEmail} disabled={testState.pending}>
                  {testState.pending ? "Sending..." : "Send Test Email"}
                </Button>
              ) : null}
            </div>
            {testState.message ? (
              <p className={`text-sm sm:col-span-2 ${testState.error ? "text-destructive" : "text-emerald-600"}`}>
                {testState.message}
              </p>
            ) : null}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
