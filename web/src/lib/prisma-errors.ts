import type { Prisma } from "@/generated/prisma/client";

/**
 * Which column(s) a P2002 unique-constraint violation hit. Prisma 7 with a
 * driver adapter (`@prisma/adapter-pg`) never populates the classic
 * `error.meta.target` - it's always `undefined` here - the real column
 * name(s) live under `error.meta.driverAdapterError.cause.constraint.fields`
 * instead. Falls back to `target` in case a future Prisma/adapter version
 * restores it.
 */
export function uniqueConstraintFields(error: Prisma.PrismaClientKnownRequestError): string[] {
  const meta = error.meta as
    | {
        target?: string[] | string;
        driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
      }
    | undefined;

  const adapterFields = meta?.driverAdapterError?.cause?.constraint?.fields;
  if (adapterFields && adapterFields.length > 0) return adapterFields;

  if (Array.isArray(meta?.target)) return meta.target;
  if (typeof meta?.target === "string") return [meta.target];
  return [];
}
