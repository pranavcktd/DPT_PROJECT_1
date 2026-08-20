import { requireModulePermission, ForbiddenError, UnauthenticatedError } from "@/lib/session";
import { db } from "@/lib/db";
import { buildDepartmentBackupZip } from "@/lib/backup";
import { sendMail, SmtpNotConfiguredError } from "@/lib/mail";

export async function GET() {
  let user;
  try {
    user = await requireModulePermission("DEPARTMENT_SETTINGS", "view");
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const departmentId = BigInt(user.departmentId);
  const department = await db.departments.findUniqueOrThrow({
    where: { id: departmentId },
    select: { tenant_code: true, department_name: true, official_email: true },
  });
  const zip = await buildDepartmentBackupZip(departmentId);
  const filename = `${department.tenant_code}-backup-${new Date().toISOString().slice(0, 10)}.zip`;

  const notifyEmail =
    department.official_email ?? (await db.users.findUniqueOrThrow({ where: { id: BigInt(user.id) }, select: { email: true } })).email;
  try {
    await sendMail({
      departmentId: null,
      to: notifyEmail,
      subject: `Data backup - ${department.department_name}`,
      html: `<p>A copy of the backup you just downloaded for <strong>${department.department_name}</strong> is attached here as well, in case you ever need it and don't have the download.</p>`,
      attachments: [{ filename, content: zip, contentType: "application/zip" }],
    });
  } catch (error) {
    if (!(error instanceof SmtpNotConfiguredError)) throw error;
    // No SMTP configured - fine, the download itself already went through.
  }

  return new Response(new Uint8Array(zip), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
