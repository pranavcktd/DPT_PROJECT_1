import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export async function writeAuditLog(params: {
  departmentId: bigint | null;
  performedBy: bigint;
  tableName: string;
  recordId: bigint;
  action: AuditAction;
  oldData?: unknown;
  newData?: unknown;
  reason?: string;
}) {
  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent");

  await db.audit_logs.create({
    data: {
      department_id: params.departmentId,
      performed_by: params.performedBy,
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_data: params.oldData === undefined ? undefined : JSON.parse(JSON.stringify(params.oldData, bigIntReplacer)),
      new_data: params.newData === undefined ? undefined : JSON.parse(JSON.stringify(params.newData, bigIntReplacer)),
      reason: params.reason,
      ip_address: ipAddress,
      user_agent: userAgent,
    },
  });
}

function bigIntReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}
