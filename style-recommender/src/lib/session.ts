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
  try {
    const token = await getToken({
      req: {
        cookies: Object.fromEntries(
          (await cookies()).getAll().map((c) => [c.name, c.value])
        ),
      } as Parameters<typeof getToken>[0]["req"],
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    const email = token?.email as string | undefined;
    if (!token || !email) return null;

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
