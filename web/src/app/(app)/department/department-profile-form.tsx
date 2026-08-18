"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { departmentProfileSchema, type DepartmentProfileValues } from "./schema";
import { updateDepartmentProfile } from "./actions";

type StateCodeOption = { state_code: string; state_name: string };

export function DepartmentProfileForm({
  department,
  stateCodes,
}: {
  department: DepartmentProfileValues & { logo_path: string | null };
  stateCodes: StateCodeOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DepartmentProfileValues>({
    resolver: zodResolver(departmentProfileSchema),
    defaultValues: department,
  });

  async function onSubmit(values: DepartmentProfileValues) {
    setServerError(null);
    setSuccessMessage(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value ?? ""));
    const file = fileInputRef.current?.files?.[0];
    if (file) formData.append("logo", file);

    const result = await updateDepartmentProfile({ error: null }, formData);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setSuccessMessage("Department profile saved.");
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Profile</CardTitle>
        <CardDescription>
          Used as the letterhead on generated Payment Certificates and Work Experience Certificates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-4">
              {department.logo_path ? (
                <Image
                  src={department.logo_path}
                  alt="Department logo"
                  width={64}
                  height={64}
                  className="rounded border object-contain"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded border text-xs text-muted-foreground">
                  No logo
                </div>
              )}
              <div className="space-y-1">
                <FormLabel htmlFor="logo">Department Logo (PNG or JPEG, max 2MB)</FormLabel>
                <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg" ref={fileInputRef} />
              </div>
            </div>

            <FormField
              control={form.control}
              name="department_name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Department Name</FormLabel>
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
              name="gstin"
              render={({ field }) => {
                const derivedCode = field.value?.slice(0, 2) ?? "";
                const derivedState = stateCodes.find((s) => s.state_code === derivedCode);
                return (
                  <FormItem>
                    <FormLabel>GSTIN</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={15} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {field.value
                        ? derivedState
                          ? `GST State Code (from GSTIN): ${derivedState.state_code} - ${derivedState.state_name}`
                          : "GSTIN's first 2 digits don't match a known state code."
                        : "GST State Code is auto-detected from the GSTIN above - used to determine intra/inter-state GST TDS on payments."}
                    </p>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="gstin_registration_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GSTIN Registration Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Invoice dates in Payment Entry cannot be earlier than this date.
                  </p>
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
                    <Input {...field} maxLength={10} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TAN</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={10} />
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
                  <FormLabel>Official Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
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

            {serverError ? <p className="text-sm text-destructive sm:col-span-2">{serverError}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-600 sm:col-span-2">{successMessage}</p> : null}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Department Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
