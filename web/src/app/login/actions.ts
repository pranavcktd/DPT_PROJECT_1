"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";

export type AdminContact = { name: string; email: string; phone: string | null };
export type LoginState = { error: string | null; adminContact?: AdminContact | null };

async function getAdminContact(): Promise<AdminContact | null> {
  const admin = await db.users.findFirst({
    where: { roles: { role_code: "SUPER_ADMIN" } },
    orderBy: { created_at: "asc" },
    select: { name: true, email: true, phone: true },
  });
  return admin ?? null;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = formData.get("callbackUrl");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Invalid email or password." };
  }

  // Checked here (before calling signIn) purely to show a specific, actionable
  // message with the Super Admin's contact details instead of NextAuth's
  // generic invalid-credentials error - auth.ts's authorize() independently
  // re-checks and blocks this same condition regardless, so this is a UX
  // layer on top of the real enforcement, not a substitute for it.
  const candidate = await db.users.findUnique({
    where: { email },
    include: { departments_users_department_idTodepartments: true },
  });
  if (candidate && candidate.status === "ACTIVE" && (await bcrypt.compare(password, candidate.password_hash))) {
    const department = candidate.departments_users_department_idTodepartments;
    if (department) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const subscriptionExpired = department.subscription_end_date !== null && department.subscription_end_date < today;
      const departmentDisabled = department.status !== "ACTIVE";

      if (subscriptionExpired || departmentDisabled) {
        const adminContact = await getAdminContact();
        return {
          error: departmentDisabled
            ? "Sorry, your department account has been disabled. Kindly contact the administrator."
            : "Sorry, your subscription has expired. Kindly contact the administrator.",
          adminContact,
        };
      }
    }
  }

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
