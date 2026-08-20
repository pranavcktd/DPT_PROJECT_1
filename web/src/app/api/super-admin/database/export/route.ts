import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { requireSuperAdmin, ForbiddenError, UnauthenticatedError } from "@/lib/session";

const execFileAsync = promisify(execFile);

/**
 * `pg_dump` on PATH is the normal, portable case. On Windows, a PostgreSQL
 * install often doesn't add its bin/ directory to PATH, so also try the
 * standard install locations before giving up - this is what makes the
 * button actually work on a typical local Windows dev machine rather than
 * just failing with a clear message every time.
 */
function resolvePgDumpPath(): string {
  if (process.platform !== "win32") return "pg_dump";
  for (const version of ["17", "16", "15", "14", "13"]) {
    const candidate = `C:\\Program Files\\PostgreSQL\\${version}\\bin\\pg_dump.exe`;
    if (existsSync(candidate)) return candidate;
  }
  return "pg_dump";
}

/**
 * Whole-database SQL dump via pg_dump - the standard, most reliable way to
 * get a restorable clone of this schema (generated columns, triggers, CHECK
 * constraints and all, none of which a hand-rolled export could safely
 * reproduce). Requires the pg_dump binary to be present on whatever host
 * runs this app; works today in local dev. If this is ever deployed
 * somewhere without Postgres client tools installed, this one route won't
 * work there - see the ENOENT handling below.
 */
export async function GET() {
  try {
    await requireSuperAdmin();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Unauthorized", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw error;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Response("DATABASE_URL is not configured on this server.", { status: 500 });
  }

  try {
    const { stdout } = await execFileAsync(
      resolvePgDumpPath(),
      ["--no-owner", "--no-privileges", databaseUrl],
      { maxBuffer: 1024 * 1024 * 1024, encoding: "utf8" },
    );

    const filename = `dpt-database-backup-${new Date().toISOString().slice(0, 10)}.sql`;
    return new Response(stdout, {
      headers: { "Content-Type": "application/sql", "Content-Disposition": `attachment; filename="${filename}"` },
    });
  } catch (error) {
    const isMissingBinary = error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
    if (isMissingBinary) {
      return new Response(
        "pg_dump isn't available on this server, so a database file can't be generated here. Run pg_dump directly against DATABASE_URL from a machine that has the Postgres client tools installed.",
        { status: 500 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Failed to export the database: ${message}`, { status: 500 });
  }
}
