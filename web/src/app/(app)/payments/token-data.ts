import "server-only";
import { db } from "@/lib/db";
import type { TokenOption } from "@/components/token-combobox";

/** Distinct treasury tokens previously used for non-salary payments in this
 * department, most recent first - feeds the token-entry search/autocomplete. */
export async function getPaymentTokenOptions(departmentId: bigint): Promise<TokenOption[]> {
  const rows = await db.payments.findMany({
    where: { department_id: departmentId, pay_mode: "TREASURY", treasury_token_number: { not: null } },
    distinct: ["treasury_token_number"],
    orderBy: [{ treasury_token_number: "asc" }, { token_generated_date: "desc" }],
    select: { treasury_token_number: true, token_generated_date: true },
  });
  return rows.map((r) => ({
    token_number: r.treasury_token_number!,
    token_generated_date: r.token_generated_date?.toISOString().slice(0, 10) ?? null,
  }));
}
