import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    roleCode: string;
    departmentId: string | null;
    mustChangePassword: boolean;
    previousLoginAt: string | null;
  }

  interface Session {
    user: {
      id: string;
      roleCode: string;
      departmentId: string | null;
      mustChangePassword: boolean;
      previousLoginAt: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    roleCode: string;
    departmentId: string | null;
    mustChangePassword: boolean;
    previousLoginAt: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleCode: string;
    departmentId: string | null;
    mustChangePassword: boolean;
    previousLoginAt: string | null;
  }
}
