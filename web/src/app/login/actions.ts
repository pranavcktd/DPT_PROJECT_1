"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";

export type LoginState = { error: string | null };

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = formData.get("callbackUrl");

  try {
    // redirect: false so we can decide the destination ourselves below - letting
    // signIn's own redirectTo land on /dashboard first and relying on proxy.ts to
    // bounce a forced-password-change user onward loses the race against Next's
    // client-side transition for this specific first hop (verified: a hard reload
    // or any later navigation does correctly get caught by proxy, just not this one).
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  const target = typeof callbackUrl === "string" && callbackUrl ? callbackUrl : "/dashboard";

  if (typeof email === "string") {
    const user = await db.users.findUnique({ where: { email }, select: { must_change_password: true } });
    if (user?.must_change_password) {
      redirect("/change-password");
    }
  }

  redirect(target);
}
