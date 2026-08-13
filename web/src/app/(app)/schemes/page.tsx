import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { SchemeFormDialog } from "./scheme-form-dialog";

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

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

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="schemes"
        title="Work Schemes"
        description="Government schemes and their sanctioned budgets."
        action={can_create ? <SchemeFormDialog triggerLabel="New Scheme" triggerClassName={theme.button} /> : null}
      />
      <Card>
        <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scheme Name</TableHead>
              <TableHead>Financial Year</TableHead>
              <TableHead className="text-right">Sanctioned</TableHead>
              <TableHead className="text-right">Allocated to Works</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Status</TableHead>
              {can_edit ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {schemes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No schemes yet.
                </TableCell>
              </TableRow>
            ) : (
              schemes.map((s) => {
                const sanctioned = Number(s.sanctioned_budget);
                const allocated = allocatedByScheme.get(s.id.toString()) ?? 0;
                const remaining = sanctioned - allocated;
                return (
                  <TableRow key={s.id.toString()}>
                    <TableCell className="font-medium">{s.scheme_name}</TableCell>
                    <TableCell>{s.financial_year}</TableCell>
                    <TableCell className="text-right">{formatINR(sanctioned)}</TableCell>
                    <TableCell className="text-right">{formatINR(allocated)}</TableCell>
                    <TableCell className={`text-right ${remaining < 0 ? "text-destructive font-medium" : ""}`}>
                      {formatINR(remaining)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>{s.status}</Badge>
                    </TableCell>
                    {can_edit ? (
                      <TableCell className="text-right">
                        <SchemeFormDialog
                          scheme={{
                            id: s.id.toString(),
                            scheme_name: s.scheme_name,
                            financial_year: s.financial_year,
                            sanctioned_budget: sanctioned,
                            description: s.description ?? "",
                            status: s.status,
                          }}
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          triggerSize="sm"
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </div>
  );
}
