import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { PaymentForm } from "../../new/payment-form";

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireModulePermission("PAYMENT_ENTRY", "edit");
  const departmentId = BigInt(user.departmentId);

  const payment = await db.payments.findFirst({ where: { id: BigInt(id), department_id: departmentId } });
  if (!payment) notFound();
  if (payment.status !== "SAVED") {
    return (
      <p className="text-sm text-muted-foreground">
        This payment is {payment.status.toLowerCase()} and can no longer be edited.
      </p>
    );
  }

  const [works, contractors, department, utilizedByWork] = await Promise.all([
    db.works.findMany({
      where: { department_id: departmentId, status: "ONGOING" },
      include: { schemes: { select: { scheme_name: true } } },
      orderBy: { work_name: "asc" },
    }),
    db.contractors.findMany({
      where: { department_id: departmentId, status: "ACTIVE" },
      orderBy: { firm_name: "asc" },
    }),
    db.departments.findUniqueOrThrow({ where: { id: departmentId } }),
    db.payments.groupBy({
      by: ["work_id"],
      where: { department_id: departmentId, status: { not: "CANCELLED" } },
      _sum: { base_cost: true },
    }),
  ]);

  const utilizedMap = new Map(utilizedByWork.map((u) => [u.work_id.toString(), Number(u._sum.base_cost ?? 0)]));

  const workOptions = works.map((w) => {
    const sanctioned = Number(w.sanctioned_cost);
    const utilized = utilizedMap.get(w.id.toString()) ?? 0;
    return {
      id: w.id.toString(),
      work_name: w.work_name,
      scheme_name: w.schemes.scheme_name,
      sanctioned,
      utilized,
      remaining: sanctioned - utilized,
    };
  });

  const contractorOptions = contractors.map((c) => ({
    id: c.id.toString(),
    firm_name: c.firm_name,
    pan_number: c.pan_number,
    gstin: c.gstin,
    gst_state_code: c.gst_state_code,
    bank_name: c.bank_name,
    account_number: c.account_number,
    ifsc_code: c.ifsc_code,
  }));

  return (
    <PaymentForm
      works={workOptions}
      contractors={contractorOptions}
      departmentStateCode={department.state_code}
      payment={{
        id: payment.id.toString(),
        work_id: payment.work_id.toString(),
        contractor_id: payment.contractor_id.toString(),
        agreement_number: payment.agreement_number_snapshot,
        agreement_date: payment.agreement_date_snapshot.toISOString().slice(0, 10),
        invoice_number: payment.invoice_number,
        invoice_date: payment.invoice_date.toISOString().slice(0, 10),
        base_cost: Number(payment.base_cost),
        gst_rate: Number(payment.gst_rate),
        gst_rate_is_manual: payment.gst_rate_is_manual,
        it_tds_rate: Number(payment.it_tds_rate),
        it_tds_rate_is_manual: payment.it_tds_rate_is_manual,
        gst_tds_rate: Number(payment.gst_tds_rate),
        gst_tds_rate_is_manual: payment.gst_tds_rate_is_manual,
        gst_tds_type: payment.gst_tds_type,
        labour_cess_rate: Number(payment.labour_cess_rate),
        labour_cess_rate_is_manual: payment.labour_cess_rate_is_manual,
        royalty_type: payment.royalty_type,
        royalty_value: Number(payment.royalty_value),
        stamp_duty_type: payment.stamp_duty_type,
        stamp_duty_value: Number(payment.stamp_duty_value),
        other_deduction_type: payment.other_deduction_type,
        other_deduction_value: Number(payment.other_deduction_value),
        other_deduction_remarks: payment.other_deduction_remarks ?? "",
        pay_mode: payment.pay_mode,
        treasury_token_number: payment.treasury_token_number ?? "",
        token_generated_date: payment.token_generated_date?.toISOString().slice(0, 10) ?? "",
        actual_payment_date: payment.actual_payment_date?.toISOString().slice(0, 10) ?? "",
        remarks: payment.remarks ?? "",
      }}
    />
  );
}
