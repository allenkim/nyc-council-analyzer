import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { prisma } from "./db";

export type AuthUser = { id: string; email: string; name: string | null };

/**
 * Get the authenticated user by reading the NextAuth JWT cookie.
 *
 * The JWT is set by the finance app's NextAuth on the whatisms.com domain.
 * Caddy's forward_auth ensures only authenticated requests reach us,
 * but we still read the JWT to know WHO the user is.
 *
 * On first visit, creates a local User record matching the email.
 */
export async function getUser(): Promise<AuthUser | null> {
  // Dev bypass: auto-create/return a test user when no NEXTAUTH_SECRET is set
  if (!process.env.NEXTAUTH_SECRET) {
    const user = await prisma.user.upsert({
      where: { email: "dev@test.com" },
      update: {},
      create: { email: "dev@test.com", name: "Dev User", image: null },
    });
    return { id: user.id, email: user.email, name: user.name };
  }

  try {
    // Finance app uses NextAuth v5 which names cookies "authjs.*"
    // Style app has NextAuth v4 whose getToken defaults to "next-auth.*"
    // Explicitly specify the v5 cookie name so we can decode the JWT
    const cookieName = "__Secure-authjs.session-token";

    const allCookies = Object.fromEntries(
      (await cookies()).getAll().map((c) => [c.name, c.value])
    );

    const token = await getToken({
      req: { cookies: allCookies } as Parameters<typeof getToken>[0]["req"],
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: true, // Always true — site is behind HTTPS via Caddy
      cookieName,
    });

    const email = token?.email as string | undefined;
    if (!token || !email) {
      console.error("[session] token decode failed", {
        hasToken: !!token,
        email,
        cookieNames: Object.keys(allCookies),
        hasCookie: cookieName in allCookies,
      });
      return null;
    }

    // Upsert: create local user record on first visit
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: (token.name as string) ?? null },
      create: {
        email,
        name: (token.name as string) ?? null,
        image: (token.picture as string) ?? null,
      },
    });

    return { id: user.id, email: user.email, name: user.name };
  } catch (error) {
    console.error("Error reading session:", error);
    return null;
  }
}
