import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { cn, formatEnumLabel } from "@/lib/utils";

export default async function CertificatesPage() {
  const { user, can_create } = await getModulePermissions("WORK_EXPERIENCE_CERTIFICATE");
  const departmentId = BigInt(user.departmentId);
  const theme = MODULE_THEME.certificates;

  const certificates = await db.work_experience_certificates.findMany({
    where: { department_id: departmentId },
    include: { works: { select: { work_name: true } }, contractors: { select: { firm_name: true } } },
    orderBy: { issued_at: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        moduleKey="certificates"
        title="Work Experience Certificates"
        description="Issue completion certificates contractors can use for future tenders."
        action={
          can_create ? (
            <Link href="/certificates/new" className={cn(buttonVariants({ variant: "default" }), theme.button)}>
              Issue Certificate
            </Link>
          ) : null
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate #</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Work</TableHead>
                <TableHead className="text-right">Executed Value</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No certificates issued yet.
                  </TableCell>
                </TableRow>
              ) : (
                certificates.map((c) => (
                  <TableRow key={c.id.toString()}>
                    <TableCell className="font-medium">{c.certificate_number}</TableCell>
                    <TableCell>{c.contractors.firm_name}</TableCell>
                    <TableCell>{c.works.work_name}</TableCell>
                    <TableCell className="text-right">
                      ₹{Number(c.executed_value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {c.performance_rating_label ? formatEnumLabel(c.performance_rating_label) : "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.issued_at.toISOString().slice(0, 10)}</TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`/api/work-experience-certificates/${c.id}/certificate`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        View PDF
                      </a>
                    </TableCell>
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
