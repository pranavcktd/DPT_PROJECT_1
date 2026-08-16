import { z } from "zod";

export const staffFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(150),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role_id: z.string().min(1, "Role is required"),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  // JSON-encoded Record<module_id, {can_view,can_create,can_edit,can_delete}> -
  // simpler to ship as one field than dozens of dynamically-named FormData entries.
  permissions_json: z.string(),
});

export type StaffFormValues = z.infer<typeof staffFormSchema>;

export const permissionFlags = z.object({
  can_view: z.boolean(),
  can_create: z.boolean(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});

export const permissionsMapSchema = z.record(z.string(), permissionFlags);

export type PermissionFlags = z.infer<typeof permissionFlags>;
export type PermissionsMap = Record<string, PermissionFlags>;
