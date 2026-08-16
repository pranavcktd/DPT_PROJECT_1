"use server";

import { z } from "zod";
import { requireDepartmentUser, requireModulePermission } from "@/lib/session";
import { sendMail, SmtpNotConfiguredError } from "@/lib/mail";
import { formatDateForReport, formatDateForReport as fmtDate, toCsv } from "@/lib/reports";
import { formatEnumLabel } from "@/lib/utils";
import type { SendEmailActionState } from "@/components/send-email-dialog";
import { getContractorsReportRows } from "./data/contractors/data";
import { getSchemesReportRows } from "./data/schemes/data";
import { getWorksReportRows } from "./data/works/data";
import { getPaymentsReportRows } from "./data/payments/data";
import { getSalaryPaymentsReportRows } from "./data/salary-payments/data";
import { getCertificatesReportRows } from "./data/certificates/data";
import { getEmployeesReportRows } from "./data/employees/data";
import { getTdsReportRows } from "./tds/data";
import { getGstr7ReportRows } from "./gstr7/data";
import { get24qReportRows } from "./24q/data";

const baseSchema = z.object({ to: z.string().trim().email(), reportType: z.string() });

async function buildReport(reportType: string, params: Record<string, string>, departmentId: bigint) {
  switch (reportType) {
    case "contractors": {
      await requireModulePermission("CONTRACTOR_MASTER", "view");
      const rows = await getContractorsReportRows(departmentId, params.q ?? "", (params.status as never) ?? "ALL");
      return {
        filename: "contractors-report.csv",
        csv: toCsv(["Firm Name", "PAN", "GSTIN", "Vendor Code", "Phone", "Email", "Status"], rows.map((c) => [c.firm_name, c.pan_number, c.gstin, c.vendor_code, c.phone, c.email, c.status])),
      };
    }
    case "schemes": {
      await requireModulePermission("SCHEME_MASTER", "view");
      const rows = await getSchemesReportRows(departmentId, params.q ?? "", (params.status as never) ?? "ALL");
      return {
        filename: "schemes-report.csv",
        csv: toCsv(["Scheme Name", "Financial Year", "Sanctioned Budget", "Allocated", "Remaining", "Status"], rows.map((s) => {
          const sanctioned = Number(s.sanctioned_budget);
          return [s.scheme_name, s.financial_year, sanctioned, s.allocated, sanctioned - s.allocated, s.status];
        })),
      };
    }
    case "works": {
      await requireModulePermission("WORK_MASTER", "view");
      const rows = await getWorksReportRows(departmentId, params.q ?? "", (params.status as never) ?? "ALL");
      return {
        filename: "works-report.csv",
        csv: toCsv(["Work Name", "Scheme", "Sanctioned Cost", "Status"], rows.map((w) => [w.work_name, w.schemes.scheme_name, Number(w.sanctioned_cost), w.status])),
      };
    }
    case "payments": {
      await requireModulePermission("PAYMENT_ENTRY", "view");
      const rows = await getPaymentsReportRows(departmentId, params.q ?? "", (params.status as never) ?? "ALL", params.from ?? "", params.to ?? "");
      return {
        filename: "non-salary-payments-report.csv",
        csv: toCsv(
          ["Invoice Number", "Contractor", "Work", "Base Cost", "Net Payable", "Status", "Invoice Date", "Treasury Date"],
          rows.map((p) => [p.invoice_number, p.contractor_name_snapshot, p.work_name_snapshot, Number(p.base_cost), Number(p.net_payable_amount ?? 0), p.status, fmtDate(p.invoice_date), fmtDate(p.treasury_payment_date)]),
        ),
      };
    }
    case "salary-payments": {
      await requireModulePermission("SALARY_PAYMENT_ENTRY", "view");
      const rows = await getSalaryPaymentsReportRows(departmentId, params.q ?? "", (params.status as never) ?? "ALL", params.from ?? "", params.to ?? "");
      return {
        filename: "salary-payments-report.csv",
        csv: toCsv(
          ["Employee", "Payment Type", "Gross Salary", "IT Deduction", "Net Payable", "Status", "Payment Date"],
          rows.map((p) => [p.employee_name_snapshot, p.payment_type === "OTHER" ? p.other_type_label : formatEnumLabel(p.payment_type), Number(p.gross_salary), Number(p.it_deduction_amount), Number(p.net_payable_amount ?? 0), p.status, fmtDate(p.treasury_payment_date)]),
        ),
      };
    }
    case "certificates": {
      await requireModulePermission("WORK_EXPERIENCE_CERTIFICATE", "view");
      const rows = await getCertificatesReportRows(departmentId, params.q ?? "");
      return {
        filename: "certificates-report.csv",
        csv: toCsv(
          ["Certificate Number", "Contractor", "Work", "Executed Value", "Rating", "Issued"],
          rows.map((c) => [c.certificate_number, c.contractors.firm_name, c.works.work_name, Number(c.executed_value), c.performance_rating_label ? formatEnumLabel(c.performance_rating_label) : null, fmtDate(c.issued_at)]),
        ),
      };
    }
    case "employees": {
      await requireModulePermission("EMPLOYEE_MASTER", "view");
      const rows = await getEmployeesReportRows(departmentId, params.q ?? "", (params.status as never) ?? "ALL");
      return {
        filename: "employees-report.csv",
        csv: toCsv(["Employee Name", "PAN", "Mobile", "Joining Date", "Transfer Date", "Status"], rows.map((e) => [e.employee_name, e.pan_number, e.mobile, fmtDate(e.joining_date), fmtDate(e.transfer_date), e.status])),
      };
    }
    case "tds": {
      await requireModulePermission("TAX_LEDGER_REPORT", "view");
      const fy = params.fy;
      const quarter = (Number(params.quarter) || 1) as 1 | 2 | 3 | 4;
      const rows = await getTdsReportRows(departmentId, fy, quarter, params.contractor || undefined);
      return {
        filename: `TDS-26Q-${fy}-Q${quarter}.csv`,
        csv: toCsv(["Contractor / Party Name", "PAN", "Base Cost (A)", "Total IT TDS Deducted", "Payment Date"], rows.map((r) => [r.contractor_name_snapshot, r.contractor_pan_snapshot, Number(r.base_cost), Number(r.it_tds_amount ?? 0), fmtDate(r.treasury_payment_date)])),
      };
    }
    case "gstr7": {
      await requireModulePermission("TAX_LEDGER_REPORT", "view");
      const year = Number(params.year);
      const month = Number(params.month);
      const rows = await getGstr7ReportRows(departmentId, year, month, params.contractor || undefined);
      return {
        filename: `GSTR7-${year}-${String(month).padStart(2, "0")}.csv`,
        csv: toCsv(
          ["Contractor Name", "GSTIN", "Invoice No.", "Invoice Date", "Payment Date", "Total Bill Value (C)", "Mobile Number", "Base Cost (A)", "IGST", "CGST", "SGST"],
          rows.map((r) => [r.contractor_name_snapshot, r.contractor_gstin_snapshot, r.invoice_number, fmtDate(r.invoice_date), fmtDate(r.treasury_payment_date), Number(r.total_bill_value ?? 0), r.contractors.phone, Number(r.base_cost), Number(r.igst_tds_amount ?? 0), Number(r.cgst_tds_amount ?? 0), Number(r.sgst_tds_amount ?? 0)]),
        ),
      };
    }
    case "24q": {
      await requireModulePermission("TAX_LEDGER_REPORT", "view");
      const fy = params.fy;
      const quarter = (Number(params.quarter) || 1) as 1 | 2 | 3 | 4;
      const rows = await get24qReportRows(departmentId, fy, quarter, params.employee || undefined);
      return {
        filename: `TDS-24Q-${fy}-Q${quarter}.csv`,
        csv: toCsv(["Employee Name", "PAN", "Gross Salary", "Total IT TDS Deducted", "Payment Date"], rows.map((r) => [r.employee_name_snapshot, r.employee_pan_snapshot, Number(r.gross_salary), Number(r.it_deduction_amount ?? 0), formatDateForReport(r.treasury_payment_date)])),
      };
    }
    default:
      throw new Error("Unknown report type");
  }
}

export async function emailReportCsv(_prev: SendEmailActionState, formData: FormData): Promise<SendEmailActionState> {
  const parsed = baseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "A valid recipient email is required." };

  // departmentId is the same for every role; the specific view permission for
  // this report type is enforced inside buildReport()'s matching case.
  const user = await requireDepartmentUser();
  const departmentId = BigInt(user.departmentId);
  const params = Object.fromEntries(formData) as Record<string, string>;

  try {
    const { filename, csv } = await buildReport(parsed.data.reportType, params, departmentId);

    await sendMail({
      departmentId,
      to: parsed.data.to,
      subject: `Report: ${filename.replace(/\.csv$/, "")}`,
      html: `<p>Please find the attached report.</p>`,
      attachments: [{ filename, content: Buffer.from(csv, "utf8"), contentType: "text/csv" }],
    });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) return { error: error.message };
    return { error: error instanceof Error ? `Failed to send: ${error.message}` : "Failed to send email." };
  }

  return { error: null, success: true };
}
