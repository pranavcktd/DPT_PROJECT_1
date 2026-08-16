import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { SchemeFormDialog } from "./scheme-form-dialog";
import { SchemesImportDialog } from "./import-dialog";
import { SchemesTable } from "./schemes-table";

export default async function SchemesPage() {
  const { user, can_create, can_edit } = await getModulePermissions("SCHEME_MASTER");
  const departmentId = BigInt(user.departmentId);
  const theme = MODULE_THEME.schemes;

  const [schemes, allocations] = await Promise.all([
    db.schemes.findMany({ where: { department_id: departmentId }, orderBy: [{ financial_year: "desc" }, { scheme_name: "asc" }] }),
    db.works.groupBy({
      by: ["scheme_id"],
      where: { department_id: departmentId, status: { not: "TERMINATED" } },
      _sum: { sanctioned_cost: true },
    }),
  ]);

  const allocatedByScheme = new Map(allocations.map((a) => [a.scheme_id.toString(), Number(a._sum.sanctioned_cost ?? 0)]));

  const rows = schemes.map((s) => ({
    id: s.id.toString(),
    scheme_name: s.scheme_name,
    financial_year: s.financial_year,
    sanctioned_budget: Number(s.sanctioned_budget),
    allocated: allocatedByScheme.get(s.id.toString()) ?? 0,
    description: s.description ?? "",
    status: s.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="schemes"
        title="Work Schemes"
        description="Government schemes and their sanctioned budgets."
        action={
          can_create ? (
            <div className="flex flex-wrap items-center gap-2">
              <a href="/api/schemes/export" className={buttonVariants({ variant: "outline" })}>
                Export
              </a>
              <SchemesImportDialog />
              <SchemeFormDialog triggerLabel="New Scheme" triggerClassName={theme.button} />
            </div>
          ) : null
        }
      />
      <SchemesTable schemes={rows} can_edit={can_edit} />
    </div>
  );
}
