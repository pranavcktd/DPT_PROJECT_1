import "server-only";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { buildDepartmentBackupZip } from "@/lib/backup";
import { sendMail, SmtpNotConfiguredError } from "@/lib/mail";

/**
 * Wipes a department's module/transactional data - contractors, employees,
 * schemes, works, payments, salary payments, certificates - but deliberately
 * leaves the department itself, its staff logins, SMTP settings, DDO
 * details, and its audit/login history intact. This is "start over with
 * fresh data," not "delete the department" (that's deleteDepartment, a
 * separate, even more destructive action).
 *
 * Always backs up first (see buildDepartmentBackupZip) and returns that zip
 * so the caller can hand it to the user before/alongside the deletion - a
 * mistaken clear is recoverable via Restore from Backup. Also makes a
 * best-effort attempt to email the same backup, but never lets a missing/
 * misconfigured SMTP block the wipe itself.
 */
export async function clearDepartmentData(
  departmentId: bigint,
  performedBy: bigint,
  notifyEmail: string,
): Promise<{ backupZip: Buffer; emailSent: boolean; deletedCounts: Record<string, number> }> {
  const department = await db.departments.findUniqueOrThrow({ where: { id: departmentId } });
  const backupZip = await buildDepartmentBackupZip(departmentId);

  let emailSent = false;
  try {
    await sendMail({
      departmentId: null,
      to: notifyEmail,
      subject: `Backup before data reset - ${department.department_name}`,
      html: `<p>A full backup of <strong>${department.department_name}</strong> was taken automatically just before all its data was cleared. Keep this attachment safe - it can be restored from Department Profile (or by Super Admin) if this was done in error.</p>`,
      attachments: [
        { filename: `${department.tenant_code}-pre-clear-backup.zip`, content: backupZip, contentType: "application/zip" },
      ],
    });
    emailSent = true;
  } catch (error) {
    if (!(error instanceof SmtpNotConfiguredError)) throw error;
    // No SMTP configured - fine, the caller still gets the zip back to download directly.
  }

  const deletedCounts: Record<string, number> = {};

  await db.$transaction(async (tx) => {
    const certLogs = await tx.certificate_logs.deleteMany({ where: { department_id: departmentId } });
    deletedCounts.certificateLogs = certLogs.count;

    const certs = await tx.work_experience_certificates.deleteMany({ where: { department_id: departmentId } });
    deletedCounts.certificates = certs.count;

    const payments = await tx.payments.deleteMany({ where: { department_id: departmentId } });
    deletedCounts.payments = payments.count;

    const salaryPayments = await tx.salary_payments.deleteMany({ where: { department_id: departmentId } });
    deletedCounts.salaryPayments = salaryPayments.count;

    const works = await tx.works.deleteMany({ where: { department_id: departmentId } });
    deletedCounts.works = works.count;

    const schemes = await tx.schemes.deleteMany({ where: { department_id: departmentId } });
    deletedCounts.schemes = schemes.count;

    const contractors = await tx.contractors.deleteMany({ where: { department_id: departmentId } });
    deletedCounts.contractors = contractors.count;

    const employees = await tx.employees.deleteMany({ where: { department_id: departmentId } });
    deletedCounts.employees = employees.count;
  });

  await writeAuditLog({
    departmentId,
    performedBy,
    tableName: "departments",
    recordId: departmentId,
    action: "DELETE",
    newData: deletedCounts,
    reason: `All module data cleared (contractors, employees, schemes, works, payments, salary payments, certificates) - a backup was taken first${emailSent ? " and emailed" : ""}.`,
  });

  return { backupZip, emailSent, deletedCounts };
}
