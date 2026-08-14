import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MODULE_THEME } from "@/lib/module-theme";
import { db } from "@/lib/db";
import { getModulePermissions } from "@/lib/session";
import { cn } from "@/lib/utils";
import { CertificatesTable } from "./certificates-table";

export default async function CertificatesPage() {
  const { user, can_create } = await getModulePermissions("WORK_EXPERIENCE_CERTIFICATE");
  const departmentId = BigInt(user.departmentId);
  const theme = MODULE_THEME.certificates;

  const certificates = await db.work_experience_certificates.findMany({
    where: { department_id: departmentId },
    include: { works: { select: { work_name: true } }, contractors: { select: { firm_name: true } } },
    orderBy: { issued_at: "desc" },
  });

  const rows = certificates.map((c) => ({
    id: c.id.toString(),
    certificate_number: c.certificate_number,
    contractor_name: c.contractors.firm_name,
    work_name: c.works.work_name,
    executed_value: Number(c.executed_value),
    performance_rating_label: c.performance_rating_label,
    issued_at: c.issued_at.toISOString().slice(0, 10),
  }));

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
      <CertificatesTable certificates={rows} />
    </div>
  );
}
