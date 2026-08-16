"use server";

import { signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function signOutAction() {
  const user = await requireUser();
  const userId = BigInt(user.id);
  const now = new Date();

  const openSession = await db.login_logs.findFirst({
    where: { user_id: userId, logout_at: null },
    orderBy: { login_at: "desc" },
  });

  await db.$transaction([
    db.users.update({ where: { id: userId }, data: { last_logout_at: now } }),
    ...(openSession
      ? [db.login_logs.update({ where: { id: openSession.id }, data: { logout_at: now } })]
      : []),
  ]);

  await signOut({ redirectTo: "/login" });
}
