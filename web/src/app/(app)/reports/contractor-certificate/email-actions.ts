"use server";

import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { sendMail, SmtpNotConfiguredError } from "@/lib/mail";
import { getLetterheadDepartment, getPrimaryDdo } from "@/lib/pdf/letterhead-data";
import { ContractorPaymentCertificateDocument } from "@/lib/pdf/ContractorPaymentCertificateDocument";
import type { SendEmailActionState } from "@/components/send-email-dialog";
import { getContractorCertificateRows } from "./data";

export async function emailContractorPaymentCertificate(_prev: SendEmailActionState, formData: FormData): Promise<SendEmailActionState> {
  const user = await requireModulePermission("TAX_LEDGER_REPORT", "view");
  const departmentId = BigInt(user.departmentId);

  const parsed = z
    .object({ to: z.string().trim().email(), contractorId: z.string(), from: z.string().optional(), to_date: z.string().optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "A valid recipient email is required." };

  const contractor = await db.contractors.findFirst({ where: { id: BigInt(parsed.data.contractorId), department_id: departmentId } });
  if (!contractor) return { error: "Contractor not found." };

  const from = parsed.data.from ?? "";
  const to = parsed.data.to_date ?? "";

  const [department, ddo, rows] = await Promise.all([
    getLetterheadDepartment(departmentId),
    getPrimaryDdo(departmentId),
    getContractorCertificateRows(departmentId, contractor.id, from, to),
  ]);

  const buffer = await renderToBuffer(
    ContractorPaymentCertificateDocument({
      department,
      ddo: ddo ? { ddo_name: ddo.ddo_name, designation: ddo.designation } : null,
      contractor: { firm_name: contractor.firm_name, pan_number: contractor.pan_number, gstin: contractor.gstin },
      periodFrom: from || (rows[0]?.treasury_payment_date?.toISOString() ?? new Date().toISOString()),
      periodTo: to || new Date().toISOString(),
      rows: rows.map((r) => ({
        invoice_number: r.invoice_number,
        invoice_date: r.invoice_date.toISOString(),
        work_name_snapshot: r.work_name_snapshot,
        base_cost: Number(r.base_cost),
        total_deductions: Number(r.total_deductions ?? 0),
        net_payable_amount: Number(r.net_payable_amount ?? 0),
        treasury_payment_date: r.treasury_payment_date?.toISOString() ?? null,
      })),
    }),
  );

  try {
    await sendMail({
      departmentId,
      to: parsed.data.to,
      subject: `Payment Certificate - ${contractor.firm_name}`,
      html: `<p>Please find attached the payment certificate for <strong>${contractor.firm_name}</strong> for the selected period.</p>`,
      attachments: [
        {
          filename: `contractor-payment-certificate-${contractor.firm_name.replace(/[^a-z0-9]+/gi, "-")}.pdf`,
          content: buffer,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) return { error: error.message };
    return { error: error instanceof Error ? `Failed to send: ${error.message}` : "Failed to send email." };
  }

  return { error: null, success: true };
}
