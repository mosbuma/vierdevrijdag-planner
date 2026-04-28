import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    isAdmin?: boolean;
    uid?: string;
  }
}
