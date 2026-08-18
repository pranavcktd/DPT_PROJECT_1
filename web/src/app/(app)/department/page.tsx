import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { DepartmentProfileForm } from "./department-profile-form";
import { DdoForm } from "./ddo-form";
import { SmtpSettingsForm } from "./smtp-settings-form";

export default async function DepartmentProfilePage() {
  const user = await requireModulePermission("DEPARTMENT_SETTINGS", "view");
  const departmentId = BigInt(user.departmentId);

  const [department, ddo, stateCodes, smtp] = await Promise.all([
    db.departments.findUniqueOrThrow({ where: { id: departmentId } }),
    db.ddo_details.findFirst({ where: { department_id: departmentId, is_primary: true } }),
    db.gst_state_codes.findMany({ orderBy: { state_code: "asc" } }),
    db.smtp_settings.findUnique({ where: { department_id: departmentId } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="department"
        title="Department Profile"
        description="Letterhead details, DDO, and identity used on official documents."
      />
      <DepartmentProfileForm
        department={{
          department_name: department.department_name,
          office_address: department.office_address ?? "",
          district: department.district ?? "",
          state: department.state ?? "",
          gstin: department.gstin ?? "",
          gstin_registration_date: department.gstin_registration_date?.toISOString().slice(0, 10) ?? "",
          pan: department.pan ?? "",
          tan: department.tan ?? "",
          official_email: department.official_email ?? "",
          contact_number: department.contact_number ?? "",
          logo_path: department.logo_path,
        }}
        stateCodes={stateCodes}
      />
      <DdoForm
        ddo={{
          ddo_name: ddo?.ddo_name ?? "",
          designation: ddo?.designation ?? "",
          ddo_code: ddo?.ddo_code ?? "",
          treasury_registration_code: ddo?.treasury_registration_code ?? "",
        }}
      />
      <SmtpSettingsForm
        smtp={{
          smtp_host: smtp?.smtp_host ?? "",
          smtp_port: smtp?.smtp_port ?? 587,
          smtp_username: smtp?.smtp_username ?? "",
          smtp_from_email: smtp?.smtp_from_email ?? department.official_email ?? "",
          smtp_from_name: smtp?.smtp_from_name ?? department.department_name,
          use_tls: smtp?.use_tls ?? true,
          isConfigured: !!smtp,
        }}
      />
    </div>
  );
}
