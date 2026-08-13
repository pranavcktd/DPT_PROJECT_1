import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader moduleKey="account" title="Change Password" description="Update the password for your own account." />
      <ChangePasswordForm />
    </div>
  );
}
