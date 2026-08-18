import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { SuperAdminProfileForm } from "./profile-form";

export default async function SuperAdminProfilePage() {
  const superAdmin = await requireSuperAdmin();
  const user = await db.users.findUniqueOrThrow({ where: { id: BigInt(superAdmin.id) } });

  return (
    <div className="space-y-6">
      <PageHeader moduleKey="account" title="My Profile" description="Your contact details, shown to blocked department logins." />
      <SuperAdminProfileForm profile={{ name: user.name, phone: user.phone ?? "", email: user.email }} />
    </div>
  );
}
