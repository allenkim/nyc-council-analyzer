import Google from "next-auth/providers/google";
import { ALLOWED_EMAILS } from "./allowlist";
import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config (no prisma imports).
 * Used by middleware for JWT verification.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  basePath: "/finance/api/auth",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/finance/login",
  },
  callbacks: {
    authorized({ auth }) {
      if (!auth?.user?.email) return false;
      return ALLOWED_EMAILS.includes(auth.user.email);
    },
  },
};
