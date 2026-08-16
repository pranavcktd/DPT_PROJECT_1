import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { CertificateForm } from "../../new/certificate-form";
import type { PERFORMANCE_RATINGS } from "../../schema";

export default async function EditCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireModulePermission("WORK_EXPERIENCE_CERTIFICATE", "edit");
  const departmentId = BigInt(user.departmentId);

  const certificate = await db.work_experience_certificates.findFirst({
    where: { id: BigInt(id), department_id: departmentId },
  });
  if (!certificate) notFound();

  const [works, contractors] = await Promise.all([
    db.works.findMany({
      where: { department_id: departmentId },
      orderBy: { work_name: "asc" },
    }),
    db.contractors.findMany({
      where: { department_id: departmentId, status: "ACTIVE" },
      orderBy: { firm_name: "asc" },
    }),
  ]);

  const workOptions = works.map((w) => ({
    id: w.id.toString(),
    work_name: w.work_name,
    sanctioned_cost: Number(w.sanctioned_cost),
    expected_completion_date: w.expected_completion_date?.toISOString().slice(0, 10) ?? "",
    actual_completion_date: w.actual_completion_date?.toISOString().slice(0, 10) ?? "",
    suggestedContractorId: undefined,
    executedValueSuggestion: 0,
  }));

  const contractorOptions = contractors.map((c) => ({ id: c.id.toString(), firm_name: c.firm_name }));

  return (
    <CertificateForm
      works={workOptions}
      contractors={contractorOptions}
      certificate={{
        id: certificate.id.toString(),
        work_id: certificate.work_id.toString(),
        contractor_id: certificate.contractor_id.toString(),
        certificate_number: certificate.certificate_number,
        stated_completion_date: certificate.stated_completion_date?.toISOString().slice(0, 10) ?? "",
        actual_completion_date: certificate.actual_completion_date?.toISOString().slice(0, 10) ?? "",
        sanctioned_value: Number(certificate.sanctioned_value),
        executed_value: Number(certificate.executed_value),
        performance_rating_label: (certificate.performance_rating_label ?? "SATISFACTORY") as (typeof PERFORMANCE_RATINGS)[number],
        performance_rating_score: certificate.performance_rating_score ? Number(certificate.performance_rating_score) : undefined,
        remarks: certificate.remarks ?? "",
      }}
    />
  );
}
