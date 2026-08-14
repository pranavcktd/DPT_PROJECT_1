import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { WorkFormDialog } from "./work-form-dialog";
import { WorksTable } from "./works-table";

export default async function WorksPage() {
  const { user, can_create, can_edit } = await getModulePermissions("WORK_MASTER");
  const departmentId = BigInt(user.departmentId);
  const theme = MODULE_THEME.works;

  const [works, schemes, allocations] = await Promise.all([
    db.works.findMany({
      where: { department_id: departmentId },
      include: { schemes: true },
      orderBy: { created_at: "desc" },
    }),
    db.schemes.findMany({ where: { department_id: departmentId, status: "ACTIVE" }, orderBy: { scheme_name: "asc" } }),
    db.works.groupBy({
      by: ["scheme_id"],
      where: { department_id: departmentId, status: { not: "TERMINATED" } },
      _sum: { sanctioned_cost: true },
    }),
  ]);

  const allocatedByScheme = new Map(allocations.map((a) => [a.scheme_id.toString(), Number(a._sum.sanctioned_cost ?? 0)]));
  const schemeOptions = schemes.map((s) => ({
    id: s.id.toString(),
    scheme_name: s.scheme_name,
    remaining: Number(s.sanctioned_budget) - (allocatedByScheme.get(s.id.toString()) ?? 0),
  }));

  const rows = works.map((w) => ({
    id: w.id.toString(),
    scheme_id: w.scheme_id.toString(),
    scheme_name: w.schemes.scheme_name,
    work_name: w.work_name,
    sanctioned_cost: Number(w.sanctioned_cost),
    expected_completion_date: w.expected_completion_date?.toISOString() ?? "",
    actual_completion_date: w.actual_completion_date?.toISOString() ?? "",
    status: w.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="works"
        title="Work Orders"
        description="Individual works raised against a scheme's budget."
        action={
          can_create ? (
            <WorkFormDialog schemes={schemeOptions} triggerLabel="New Work Order" triggerClassName={theme.button} />
          ) : null
        }
      />
      <WorksTable works={rows} schemeOptions={schemeOptions} can_edit={can_edit} />
    </div>
  );
}
