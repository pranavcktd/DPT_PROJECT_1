import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { ContractorFormDialog } from "./contractor-form-dialog";
import { ContractorsTable } from "./contractors-table";

export default async function ContractorsPage() {
  const { user, can_create, can_edit } = await getModulePermissions("CONTRACTOR_MASTER");
  const theme = MODULE_THEME.contractors;

  const contractors = await db.contractors.findMany({
    where: { department_id: BigInt(user.departmentId) },
    orderBy: { firm_name: "asc" },
  });

  const rows = contractors.map((c) => ({
    id: c.id.toString(),
    firm_name: c.firm_name,
    vendor_code: c.vendor_code ?? "",
    pan_number: c.pan_number,
    gstin: c.gstin ?? "",
    address: c.address ?? "",
    contact_person: c.contact_person ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    bank_name: c.bank_name ?? "",
    bank_branch: c.bank_branch ?? "",
    account_number: c.account_number ?? "",
    ifsc_code: c.ifsc_code ?? "",
    account_holder_name: c.account_holder_name ?? "",
    status: c.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="contractors"
        title="Contractor Directory"
        description="Approved contractors, PAN/GSTIN, and bank details."
        action={
          can_create ? <ContractorFormDialog triggerLabel="New Contractor" triggerClassName={theme.button} /> : null
        }
      />
      <ContractorsTable contractors={rows} can_edit={can_edit} />
    </div>
  );
}
