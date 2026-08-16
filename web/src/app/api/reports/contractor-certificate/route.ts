import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { getLetterheadDepartment, getPrimaryDdo } from "@/lib/pdf/letterhead-data";
import { ContractorPaymentCertificateDocument } from "@/lib/pdf/ContractorPaymentCertificateDocument";
import { getContractorCertificateRows } from "@/app/(app)/reports/contractor-certificate/data";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireModulePermission("TAX_LEDGER_REPORT", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const contractorId = searchParams.get("contractor_id");
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  if (!contractorId) return new Response("contractor_id is required", { status: 400 });

  const departmentId = BigInt(user.departmentId);
  const contractor = await db.contractors.findFirst({ where: { id: BigInt(contractorId), department_id: departmentId } });
  if (!contractor) return new Response("Contractor not found", { status: 404 });

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
        payment_date_is_estimated: !!r.payment_date_is_estimated,
      })),
    }),
  );

  await db.certificate_logs.create({
    data: {
      department_id: departmentId,
      certificate_type: "PAYMENT_CERTIFICATE",
      reference_table: "contractors",
      reference_id: contractor.id,
      file_format: "PDF",
      generated_by: BigInt(user.id),
      notes: `Contractor Payment Certificate for period ${from || "-"} to ${to || "-"}`,
    },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contractor-payment-certificate-${contractor.firm_name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
