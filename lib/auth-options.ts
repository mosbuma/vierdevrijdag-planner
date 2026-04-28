import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser } from "@/lib/auth-utils";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookie-name";
import { writeAuditLog } from "@/lib/audit-log";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "dev-only-change-me",
  debug: process.env.NODE_ENV === "development",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const authResult = await authenticateUser(credentials.username, credentials.password);
        if (!authResult) return null;
        return {
          id: String(authResult.id),
          name: credentials.username,
          role: authResult.role,
          isAdmin: authResult.isAdmin,
        };
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      const username = user.name ?? user.email ?? String(user.id ?? "(unknown)");
      await writeAuditLog({
        username,
        action: "auth.signIn",
        subject: user.id ? `user:${user.id}` : null,
        changes: { provider: account?.provider ?? "credentials" },
      });
    },
    async signOut(message) {
      const m = message as { token?: JWT | null; session?: { user?: { name?: string | null } } | null };
      const token = m.token;
      const username =
        token?.name ??
        m.session?.user?.name ??
        (token && typeof (token as { uid?: unknown }).uid === "string"
          ? (token as { uid: string }).uid
          : null) ??
        "(unknown)";
      await writeAuditLog({
        username: String(username),
        action: "auth.signOut",
        changes: {},
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: typeof token.role }).role;
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin;
        token.uid = (user as { id: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id ?? "";
        session.user.role = token.role as NonNullable<typeof token.role>;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-vierdevrijdag.callback-url"
          : "vierdevrijdag.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-vierdevrijdag.csrf-token"
          : "vierdevrijdag.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
