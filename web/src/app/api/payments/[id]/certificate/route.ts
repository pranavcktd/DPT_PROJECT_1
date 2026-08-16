import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { getLetterheadDepartment, getPrimaryDdo } from "@/lib/pdf/letterhead-data";
import { PaymentCertificateDocument } from "@/lib/pdf/PaymentCertificateDocument";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let user;
  try {
    user = await requireModulePermission("PAYMENT_CERTIFICATE", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const departmentId = BigInt(user.departmentId);
  const payment = await db.payments.findFirst({
    where: { id: BigInt(id), department_id: departmentId },
    include: {
      contractors: { select: { pan_number: true } },
      works: { select: { schemes: { select: { scheme_name: true } } } },
    },
  });
  if (!payment) return new Response("Payment not found", { status: 404 });

  const [department, ddo] = await Promise.all([
    getLetterheadDepartment(departmentId),
    getPrimaryDdo(departmentId),
  ]);

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
        payment_date_is_estimated: !!payment.payment_date_is_estimated,
        status: payment.status,
      },
    }),
  );

  await db.certificate_logs.create({
    data: {
      department_id: departmentId,
      certificate_type: "PAYMENT_CERTIFICATE",
      reference_table: "payments",
      reference_id: payment.id,
      file_format: "PDF",
      generated_by: BigInt(user.id),
    },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="payment-certificate-${payment.invoice_number}.pdf"`,
    },
  });
}
