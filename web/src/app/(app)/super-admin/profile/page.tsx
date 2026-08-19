import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { SuperAdminProfileForm } from "./profile-form";
import { SuperAdminSmtpSettingsForm } from "../smtp-settings-form";

export default async function SuperAdminProfilePage() {
  const superAdmin = await requireSuperAdmin();
  const [user, smtp] = await Promise.all([
    db.users.findUniqueOrThrow({ where: { id: BigInt(superAdmin.id) } }),
    db.smtp_settings.findFirst({ where: { department_id: null } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader moduleKey="account" title="My Profile" description="Your contact details, shown to blocked department logins." />
      <SuperAdminProfileForm profile={{ name: user.name, phone: user.phone ?? "", email: user.email }} />
      <SuperAdminSmtpSettingsForm
        smtp={{
          smtp_host: smtp?.smtp_host ?? "",
          smtp_port: smtp?.smtp_port ?? 587,
          smtp_username: smtp?.smtp_username ?? "",
          smtp_from_email: smtp?.smtp_from_email ?? user.email,
          smtp_from_name: smtp?.smtp_from_name ?? "Software Company",
          use_tls: smtp?.use_tls ?? true,
          isConfigured: !!smtp,
        }}
      />
    </div>
  );
}
