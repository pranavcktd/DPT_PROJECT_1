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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatEnumLabel } from "@/lib/utils";
import { staffFormSchema, type StaffFormValues, type PermissionsMap } from "./schema";
import { createStaffUser, updateStaffUser } from "./actions";

type RoleOption = { id: string; role_name: string };
type ModuleOption = { id: string; module_name: string };
type StaffRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role_id: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  isSelf: boolean;
  permissions: PermissionsMap;
};

const EMPTY_FLAGS = { can_view: false, can_create: false, can_edit: false, can_delete: false };

export function StaffFormDialog({
  staff,
  roles,
  modules,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
}: {
  staff?: StaffRecord;
  roles: RoleOption[];
  modules: ModuleOption[];
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const isEdit = !!staff;
  const lockPermissions = !!staff?.isSelf;

  const [permissions, setPermissions] = useState<PermissionsMap>(() => {
    const initial: PermissionsMap = {};
    for (const m of modules) {
      initial[m.id] = staff?.permissions[m.id] ?? { ...EMPTY_FLAGS };
    }
    return initial;
  });

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: staff
      ? { name: staff.name, email: staff.email, phone: staff.phone, role_id: staff.role_id, status: staff.status, permissions_json: "{}" }
      : { name: "", email: "", phone: "", role_id: "", status: "ACTIVE", permissions_json: "{}" },
  });

  function toggleFlag(moduleId: string, flag: keyof (typeof EMPTY_FLAGS)) {
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [flag]: !prev[moduleId]?.[flag] },
    }));
  }

  async function onSubmit(values: StaffFormValues) {
    setServerError(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value ?? ""));
    formData.set("permissions_json", JSON.stringify(permissions));

    const result = isEdit
      ? await updateStaffUser(staff.id, { error: null }, formData)
      : await createStaffUser({ error: null }, formData);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    if (result.temporaryPassword) {
      setTemporaryPassword(result.temporaryPassword);
      router.refresh();
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
        if (!next) {
          setServerError(null);
          setTemporaryPassword(null);
        }
      }}
    >
      <DialogTrigger
        className={cn(buttonVariants({ variant: triggerVariant, size: triggerSize }), triggerClassName)}
        render={<button type="button" />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Staff" : "New Staff"}</DialogTitle>
          <DialogDescription>
            The email address is the login username. New accounts get the default password{" "}
            <span className="font-mono font-medium">Client@123</span> and must change it on first login.
          </DialogDescription>
        </DialogHeader>

        {temporaryPassword ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {isEdit ? "Password reset" : "Account created"}. Temporary password:{" "}
              <span className="font-mono font-medium">{temporaryPassword}</span>. Share it with them out of band -
              they&apos;ll be required to change it on first login.
            </p>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTemporaryPassword(null);
                  form.reset();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (login username)</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} disabled={isEdit} />
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.role_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Module Access</p>
                {lockPermissions ? (
                  <p className="text-xs text-muted-foreground">
                    You can&apos;t edit your own module access here - ask another Department Admin if this needs to change.
                  </p>
                ) : null}
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead className="text-center">View</TableHead>
                        <TableHead className="text-center">Create</TableHead>
                        <TableHead className="text-center">Edit</TableHead>
                        <TableHead className="text-center">Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modules.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.module_name}</TableCell>
                          {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((flag) => (
                            <TableCell key={flag} className="text-center">
                              <Checkbox
                                checked={permissions[m.id]?.[flag] ?? false}
                                onCheckedChange={() => toggleFlag(m.id, flag)}
                                disabled={lockPermissions}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create staff account"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
