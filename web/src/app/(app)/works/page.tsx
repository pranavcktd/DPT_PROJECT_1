import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { WorkFormDialog } from "./work-form-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ONGOING: "default",
  COMPLETED: "secondary",
  TERMINATED: "destructive",
};

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

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
      <Card>
        <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Work Name</TableHead>
              <TableHead>Scheme</TableHead>
              <TableHead className="text-right">Sanctioned</TableHead>
              <TableHead>Status</TableHead>
              {can_edit ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {works.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No work orders yet.
                </TableCell>
              </TableRow>
            ) : (
              works.map((w) => (
                <TableRow key={w.id.toString()}>
                  <TableCell className="font-medium">{w.work_name}</TableCell>
                  <TableCell>{w.schemes.scheme_name}</TableCell>
                  <TableCell className="text-right">{formatINR(Number(w.sanctioned_cost))}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[w.status]}>{w.status}</Badge>
                  </TableCell>
                  {can_edit ? (
                    <TableCell className="text-right">
                      <WorkFormDialog
                        schemes={schemeOptions}
                        work={{
                          id: w.id.toString(),
                          scheme_id: w.scheme_id.toString(),
                          work_name: w.work_name,
                          sanctioned_cost: Number(w.sanctioned_cost),
                          expected_completion_date: w.expected_completion_date?.toISOString() ?? "",
                          actual_completion_date: w.actual_completion_date?.toISOString() ?? "",
                          status: w.status,
                        }}
                        triggerLabel="Edit"
                        triggerVariant="outline"
                        triggerSize="sm"
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </div>
  );
}
