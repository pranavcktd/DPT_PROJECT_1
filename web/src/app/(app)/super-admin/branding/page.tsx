import { PageHeader } from "@/components/page-header";
import { requireSuperAdmin } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { BrandingForm } from "./branding-form";

export default async function SuperAdminBrandingPage() {
  await requireSuperAdmin();
  const branding = await getBranding();

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="branding"
        title="Branding & Contact"
        description="Manage the login page footer and the contact details every signed-in user sees."
      />
      <BrandingForm
        branding={{
          company_name: branding.companyName,
          tagline: branding.tagline,
          contact_email: branding.contactEmail ?? "",
          contact_phone: branding.contactPhone ?? "",
        }}
      />
    </div>
  );
}
