import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="account"
        title="Change Password"
        description={
          user.mustChangePassword
            ? "Your password was reset. You must set a new one before continuing."
            : "Update the password for your own account."
        }
      />
      <ChangePasswordForm forced={user.mustChangePassword} />
    </div>
  );
}
