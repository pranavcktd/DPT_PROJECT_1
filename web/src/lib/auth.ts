import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email;
        const password = credentials?.password;
        const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
        const userAgent = request.headers.get("user-agent");

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await db.users.findUnique({
          where: { email },
          include: { roles: true, departments_users_department_idTodepartments: true },
        });

        const passwordValid = user ? await bcrypt.compare(password, user.password_hash) : false;

        // Department-scoped accounts (everyone except Super Admin) must
        // belong to an ACTIVE department with no lapsed subscription -
        // Super Admin's Disable/Delete/subscription controls take effect
        // immediately on next login, not just in the UI.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const department = user?.departments_users_department_idTodepartments;
        const departmentBlocked =
          !!department &&
          (department.status !== "ACTIVE" ||
            (department.subscription_end_date !== null && department.subscription_end_date < today));

        if (!user || user.status !== "ACTIVE" || !passwordValid || departmentBlocked) {
          if (user) {
            await db.login_logs.create({
              data: {
                user_id: user.id,
                department_id: user.department_id,
                ip_address: ipAddress,
                user_agent: userAgent,
                status: "FAILED",
              },
            });
          }
          return null;
        }

        await db.$transaction([
          db.users.update({
            where: { id: user.id },
            data: { last_login_at: new Date() },
          }),
          db.login_logs.create({
            data: {
              user_id: user.id,
              department_id: user.department_id,
              ip_address: ipAddress,
              user_agent: userAgent,
              status: "SUCCESS",
            },
          }),
        ]);

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          roleCode: user.roles.role_code,
          departmentId: user.department_id ? user.department_id.toString() : null,
          mustChangePassword: user.must_change_password,
          previousLoginAt: user.last_login_at ? user.last_login_at.toISOString() : null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.roleCode = user.roleCode;
        token.departmentId = user.departmentId;
        token.mustChangePassword = user.mustChangePassword;
        token.previousLoginAt = user.previousLoginAt;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.roleCode = token.roleCode;
      session.user.departmentId = token.departmentId;
      session.user.mustChangePassword = token.mustChangePassword;
      session.user.previousLoginAt = token.previousLoginAt;
      return session;
    },
  },
});
