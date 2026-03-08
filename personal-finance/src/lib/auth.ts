import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { prisma } from "./db";
import { isEmailAllowed } from "./allowlist";

/**
 * Full auth config with prisma-dependent callbacks.
 * Used by API route handler and server components (Node.js only).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ profile }) {
      const email = profile?.email;
      if (!email || !(await isEmailAllowed(email))) {
        return false;
      }
      await prisma.user.upsert({
        where: { email },
        update: {
          name: profile.name ?? null,
          image: (profile as Record<string, unknown>).picture as string ?? null,
        },
        create: {
          email,
          name: profile.name ?? null,
          image: (profile as Record<string, unknown>).picture as string ?? null,
        },
      });
      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        const user = await prisma.user.findUnique({
          where: { email: profile.email },
          select: { id: true },
        });
        if (user) token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        (session.user as unknown as Record<string, unknown>).id = token.userId;
      }
      return session;
    },
  },
});
