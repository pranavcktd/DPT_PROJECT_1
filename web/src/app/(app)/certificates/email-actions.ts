"use server";

import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { sendMail, SmtpNotConfiguredError } from "@/lib/mail";
import { getLetterheadDepartment, getPrimaryDdo } from "@/lib/pdf/letterhead-data";
import { WorkExperienceCertificateDocument } from "@/lib/pdf/WorkExperienceCertificateDocument";
import type { SendEmailActionState } from "@/components/send-email-dialog";

export async function emailWorkExperienceCertificate(_prev: SendEmailActionState, formData: FormData): Promise<SendEmailActionState> {
  const user = await requireModulePermission("WORK_EXPERIENCE_CERTIFICATE", "view");
  const departmentId = BigInt(user.departmentId);

  const parsed = z.object({ to: z.string().trim().email(), certificateId: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "A valid recipient email is required." };

  const certificate = await db.work_experience_certificates.findFirst({
    where: { id: BigInt(parsed.data.certificateId), department_id: departmentId },
    include: {
      contractors: { select: { firm_name: true, pan_number: true, gstin: true } },
      works: { select: { work_name: true, schemes: { select: { scheme_name: true } } } },
    },
  });
  if (!certificate) return { error: "Certificate not found." };

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

  try {
    await sendMail({
      departmentId,
      to: parsed.data.to,
      subject: `Work Experience Certificate - ${certificate.certificate_number}`,
      html: `<p>Please find attached the work experience certificate <strong>${certificate.certificate_number}</strong> for ${certificate.contractors.firm_name}.</p>`,
      attachments: [{ filename: `work-experience-certificate-${certificate.certificate_number}.pdf`, content: buffer, contentType: "application/pdf" }],
    });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) return { error: error.message };
    return { error: error instanceof Error ? `Failed to send: ${error.message}` : "Failed to send email." };
  }

  return { error: null, success: true };
}
