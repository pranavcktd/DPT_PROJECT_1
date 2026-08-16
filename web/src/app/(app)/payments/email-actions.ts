"use server";

import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { sendMail, SmtpNotConfiguredError } from "@/lib/mail";
import { getLetterheadDepartment, getPrimaryDdo } from "@/lib/pdf/letterhead-data";
import { PaymentCertificateDocument } from "@/lib/pdf/PaymentCertificateDocument";
import type { SendEmailActionState } from "@/components/send-email-dialog";

export async function emailPaymentCertificate(_prev: SendEmailActionState, formData: FormData): Promise<SendEmailActionState> {
  const user = await requireModulePermission("PAYMENT_CERTIFICATE", "view");
  const departmentId = BigInt(user.departmentId);

  const parsed = z.object({ to: z.string().trim().email(), paymentId: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "A valid recipient email is required." };

  const payment = await db.payments.findFirst({
    where: { id: BigInt(parsed.data.paymentId), department_id: departmentId },
    include: { contractors: { select: { pan_number: true } }, works: { select: { schemes: { select: { scheme_name: true } } } } },
  });
  if (!payment) return { error: "Payment not found." };

  const [department, ddo] = await Promise.all([getLetterheadDepartment(departmentId), getPrimaryDdo(departmentId)]);

  const buffer = await renderToBuffer(
    PaymentCertificateDocument({
      department,
      ddo: ddo ? { ddo_name: ddo.ddo_name, designation: ddo.designation } : null,
      payment: {
        id: payment.id.toString(),
        invoice_number: payment.invoice_number,
        invoice_date: payment.invoice_date.toISOString(),
        contractor_name_snapshot: payment.contractor_name_snapshot,
        contractor_pan: payment.contractors.pan_number,
        contractor_gstin_snapshot: payment.contractor_gstin_snapshot,
        work_name_snapshot: payment.work_name_snapshot,
        scheme_name: payment.works.schemes.scheme_name,
        agreement_number_snapshot: payment.agreement_number_snapshot,
        agreement_date_snapshot: payment.agreement_date_snapshot.toISOString(),
        base_cost: Number(payment.base_cost),
        gst_rate: Number(payment.gst_rate),
        gst_amount: Number(payment.gst_amount ?? 0),
        total_bill_value: Number(payment.total_bill_value ?? 0),
        it_tds_rate: Number(payment.it_tds_rate),
        it_tds_amount: Number(payment.it_tds_amount ?? 0),
        gst_tds_type: payment.gst_tds_type,
        gst_tds_rate: Number(payment.gst_tds_rate),
        cgst_tds_amount: Number(payment.cgst_tds_amount ?? 0),
        sgst_tds_amount: Number(payment.sgst_tds_amount ?? 0),
        igst_tds_amount: Number(payment.igst_tds_amount ?? 0),
        labour_cess_rate: Number(payment.labour_cess_rate),
        labour_cess_amount: Number(payment.labour_cess_amount ?? 0),
        royalty_amount: Number(payment.royalty_amount ?? 0),
        stamp_duty_amount: Number(payment.stamp_duty_amount ?? 0),
        other_deduction_amount: Number(payment.other_deduction_amount ?? 0),
        other_deduction_remarks: payment.other_deduction_remarks,
        total_deductions: Number(payment.total_deductions ?? 0),
        net_payable_amount: Number(payment.net_payable_amount ?? 0),
        cumulative_gross_amount_till_date: Number(payment.cumulative_gross_amount_till_date),
        treasury_token_number: payment.treasury_token_number,
        treasury_payment_date: payment.treasury_payment_date?.toISOString() ?? null,
        status: payment.status,
      },
    }),
  );

  try {
    await sendMail({
      departmentId,
      to: parsed.data.to,
      subject: `Payment Certificate - Invoice ${payment.invoice_number}`,
      html: `<p>Please find attached the payment certificate for invoice <strong>${payment.invoice_number}</strong>.</p>`,
      attachments: [{ filename: `payment-certificate-${payment.invoice_number}.pdf`, content: buffer, contentType: "application/pdf" }],
    });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) return { error: error.message };
    return { error: error instanceof Error ? `Failed to send: ${error.message}` : "Failed to send email." };
  }

  return { error: null, success: true };
}
