import { requireSuperAdmin, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { db } from "@/lib/db";
import { buildDepartmentBackupZip } from "@/lib/backup";
import { sendMail, SmtpNotConfiguredError } from "@/lib/mail";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const { id } = await params;
  const departmentId = BigInt(id);
  const department = await db.departments.findUniqueOrThrow({
    where: { id: departmentId },
    select: { tenant_code: true, department_name: true, official_email: true },
  });
  const zip = await buildDepartmentBackupZip(departmentId);
  const filename = `${department.tenant_code}-backup-${new Date().toISOString().slice(0, 10)}.zip`;

  const notifyEmail =
    department.official_email ??
    (await db.users.findFirst({ where: { department_id: departmentId, roles: { role_code: "DEPARTMENT_ADMIN" } }, select: { email: true } }))
      ?.email ??
    null;
  if (notifyEmail) {
    try {
      await sendMail({
        departmentId: null,
        to: notifyEmail,
        subject: `Data backup - ${department.department_name}`,
        html: `<p>A copy of the backup Super Admin just downloaded for <strong>${department.department_name}</strong> is attached here as well.</p>`,
        attachments: [{ filename, content: zip, contentType: "application/zip" }],
      });
    } catch (error) {
      if (!(error instanceof SmtpNotConfiguredError)) throw error;
      // No SMTP configured - fine, the download itself already went through.
    }
  }

  return new Response(new Uint8Array(zip), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
