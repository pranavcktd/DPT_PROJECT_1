import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    roleCode: string;
    departmentId: string | null;
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      roleCode: string;
      departmentId: string | null;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    roleCode: string;
    departmentId: string | null;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleCode: string;
    departmentId: string | null;
    mustChangePassword: boolean;
  }
}
