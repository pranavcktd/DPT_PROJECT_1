import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { PaymentForm } from "./payment-form";
import { getPaymentTokenOptions } from "../token-data";

export default async function NewPaymentPage() {
  const user = await requireModulePermission("PAYMENT_ENTRY", "create");
  const departmentId = BigInt(user.departmentId);

  const [works, contractors, department, utilizedByWork, tokens] = await Promise.all([
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
      _sum: { total_bill_value: true },
    }),
    getPaymentTokenOptions(departmentId),
  ]);

  const utilizedMap = new Map(utilizedByWork.map((u) => [u.work_id.toString(), Number(u._sum.total_bill_value ?? 0)]));

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
    address: c.address,
    district: c.district,
    state: c.state,
    pin_code: c.pin_code,
    phone: c.phone,
  }));

  return (
    <PaymentForm
      works={workOptions}
      contractors={contractorOptions}
      tokens={tokens}
      departmentStateCode={department.state_code}
      gstinRegistrationDate={department.gstin_registration_date?.toISOString().slice(0, 10) ?? null}
      allowFutureDates={department.allow_future_payment_dates}
    />
  );
}
