import { db } from "@/lib/db";
import { requireModulePermission } from "@/lib/session";
import { CertificateForm } from "./certificate-form";

export default async function NewCertificatePage() {
  const user = await requireModulePermission("WORK_EXPERIENCE_CERTIFICATE", "create");
  const departmentId = BigInt(user.departmentId);

  const [works, contractors, paymentsByWork] = await Promise.all([
    db.works.findMany({
      where: { department_id: departmentId },
      orderBy: { work_name: "asc" },
    }),
    db.contractors.findMany({
      where: { department_id: departmentId, status: "ACTIVE" },
      orderBy: { firm_name: "asc" },
    }),
    db.payments.findMany({
      where: { department_id: departmentId, status: { not: "CANCELLED" } },
      select: { work_id: true, contractor_id: true, base_cost: true },
    }),
  ]);

  // For each work, suggest the contractor most associated with its payments
  // and the executed value (sum of base cost) - both remain editable in the form.
  const workStats = new Map<string, { contractorCounts: Map<string, number>; executedValue: number }>();
  for (const p of paymentsByWork) {
    const workId = p.work_id.toString();
    const contractorId = p.contractor_id.toString();
    const stat = workStats.get(workId) ?? { contractorCounts: new Map(), executedValue: 0 };
    stat.contractorCounts.set(contractorId, (stat.contractorCounts.get(contractorId) ?? 0) + 1);
    stat.executedValue += Number(p.base_cost);
    workStats.set(workId, stat);
  }

  const workOptions = works.map((w) => {
    const stat = workStats.get(w.id.toString());
    const suggestedContractorId = stat
      ? [...stat.contractorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      : undefined;
    return {
      id: w.id.toString(),
      work_name: w.work_name,
      sanctioned_cost: Number(w.sanctioned_cost),
      expected_completion_date: w.expected_completion_date?.toISOString().slice(0, 10) ?? "",
      actual_completion_date: w.actual_completion_date?.toISOString().slice(0, 10) ?? "",
      suggestedContractorId,
      executedValueSuggestion: stat?.executedValue ?? 0,
    };
  });

  const contractorOptions = contractors.map((c) => ({ id: c.id.toString(), firm_name: c.firm_name }));

  return <CertificateForm works={workOptions} contractors={contractorOptions} />;
}
