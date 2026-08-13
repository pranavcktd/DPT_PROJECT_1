import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { getLetterheadDepartment, getPrimaryDdo } from "@/lib/pdf/letterhead-data";
import { WorkExperienceCertificateDocument } from "@/lib/pdf/WorkExperienceCertificateDocument";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let user;
  try {
    user = await requireModulePermission("WORK_EXPERIENCE_CERTIFICATE", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const departmentId = BigInt(user.departmentId);
  const certificate = await db.work_experience_certificates.findFirst({
    where: { id: BigInt(id), department_id: departmentId },
    include: {
      contractors: { select: { firm_name: true, pan_number: true, gstin: true } },
      works: { select: { work_name: true, schemes: { select: { scheme_name: true } } } },
    },
  });
  if (!certificate) return new Response("Certificate not found", { status: 404 });

  const [department, ddo, latestPayment] = await Promise.all([
    getLetterheadDepartment(departmentId),
    getPrimaryDdo(departmentId),
    db.payments.findFirst({
      where: { department_id: departmentId, work_id: certificate.work_id, contractor_id: certificate.contractor_id },
      orderBy: { created_at: "desc" },
      select: { agreement_number_snapshot: true, agreement_date_snapshot: true },
    }),
  ]);

  const buffer = await renderToBuffer(
    WorkExperienceCertificateDocument({
      department,
      ddo: ddo ? { ddo_name: ddo.ddo_name, designation: ddo.designation } : null,
      certificate: {
        certificate_number: certificate.certificate_number,
        issued_at: certificate.issued_at.toISOString(),
        contractor_name: certificate.contractors.firm_name,
        contractor_pan: certificate.contractors.pan_number,
        contractor_gstin: certificate.contractors.gstin,
        work_name: certificate.works.work_name,
        agreement_number: latestPayment?.agreement_number_snapshot ?? null,
        agreement_date: latestPayment?.agreement_date_snapshot.toISOString() ?? null,
        scheme_name: certificate.works.schemes.scheme_name,
        stated_completion_date: certificate.stated_completion_date?.toISOString() ?? null,
        actual_completion_date: certificate.actual_completion_date?.toISOString() ?? null,
        sanctioned_value: Number(certificate.sanctioned_value),
        executed_value: Number(certificate.executed_value),
        performance_rating_label: certificate.performance_rating_label,
        performance_rating_score: certificate.performance_rating_score ? Number(certificate.performance_rating_score) : null,
        remarks: certificate.remarks,
      },
    }),
  );

  await db.certificate_logs.create({
    data: {
      department_id: departmentId,
      certificate_type: "WORK_EXPERIENCE_CERTIFICATE",
      reference_table: "work_experience_certificates",
      reference_id: certificate.id,
      file_format: "PDF",
      generated_by: BigInt(user.id),
    },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="work-experience-certificate-${certificate.certificate_number}.pdf"`,
    },
  });
}
