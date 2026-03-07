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
    // Authorization is handled in middleware.ts — not here.
    // Returning true prevents NextAuth from auto-redirecting to login.
    authorized() {
      return true;
    },
  },
};
