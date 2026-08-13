import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { ContractorFormDialog } from "./contractor-form-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  BLACKLISTED: "destructive",
};

export default async function ContractorsPage() {
  const { user, can_create, can_edit } = await getModulePermissions("CONTRACTOR_MASTER");
  const theme = MODULE_THEME.contractors;

  const contractors = await db.contractors.findMany({
    where: { department_id: BigInt(user.departmentId) },
    orderBy: { firm_name: "asc" },
  });

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
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Firm Name</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Bank A/C</TableHead>
                <TableHead>Status</TableHead>
                {can_edit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No contractors yet.
                  </TableCell>
                </TableRow>
              ) : (
                contractors.map((c) => (
                  <TableRow key={c.id.toString()}>
                    <TableCell className="font-medium">{c.firm_name}</TableCell>
                    <TableCell>{c.pan_number}</TableCell>
                    <TableCell>{c.gstin ?? "-"}</TableCell>
                    <TableCell>{c.account_number ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                    </TableCell>
                    {can_edit ? (
                      <TableCell className="text-right">
                        <ContractorFormDialog
                          contractor={{
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
