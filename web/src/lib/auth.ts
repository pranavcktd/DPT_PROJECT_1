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
          include: { roles: true },
        });

        const passwordValid = user ? await bcrypt.compare(password, user.password_hash) : false;

        if (!user || user.status !== "ACTIVE" || !passwordValid) {
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
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.roleCode = token.roleCode;
      session.user.departmentId = token.departmentId;
      return session;
    },
  },
});
