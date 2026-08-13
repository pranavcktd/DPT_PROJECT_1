import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { DepartmentProfileForm } from "./department-profile-form";
import { DdoForm } from "./ddo-form";

export default async function DepartmentProfilePage() {
  const user = await requireModulePermission("DEPARTMENT_SETTINGS", "view");
  const departmentId = BigInt(user.departmentId);

  const [department, ddo, stateCodes] = await Promise.all([
    db.departments.findUniqueOrThrow({ where: { id: departmentId } }),
    db.ddo_details.findFirst({ where: { department_id: departmentId, is_primary: true } }),
    db.gst_state_codes.findMany({ orderBy: { state_code: "asc" } }),
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
    </div>
  );
}
