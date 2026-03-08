import { cookies } from "next/headers";
import { jwtDecrypt } from "jose";
import { hkdf } from "@panva/hkdf";
import { prisma } from "./db";

export type AuthUser = { id: string; email: string; name: string | null };

const COOKIE_NAME = "__Secure-authjs.session-token";

// Short-lived cache to prevent concurrent upserts from causing SQLite lock contention
// (e.g. when a page loads 10+ images that all call getUser() simultaneously)
const userCache = new Map<string, { user: AuthUser; expires: number }>();
const CACHE_TTL = 10_000; // 10 seconds

/**
 * Derive the encryption key the same way Auth.js v5 does.
 * Algorithm: A256CBC-HS512, key derived via HKDF-SHA256.
 */
async function getEncryptionKey(secret: string, salt: string): Promise<Uint8Array> {
  return new Uint8Array(
    await hkdf(
      "sha256",
      secret,
      salt,
      `Auth.js Generated Encryption Key (${salt})`,
      64
    )
  );
}

/**
 * Get the authenticated user by reading the NextAuth v5 JWT cookie.
 *
 * The JWT is set by the finance app's Auth.js v5 on the whatisms.com domain.
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
    const allCookies = Object.fromEntries(
      (await cookies()).getAll().map((c) => [c.name, c.value])
    );

    const token = allCookies[COOKIE_NAME];
    if (!token) return null;

    // Decrypt the JWE using the same key derivation as Auth.js v5
    const encryptionKey = await getEncryptionKey(
      process.env.NEXTAUTH_SECRET,
      COOKIE_NAME
    );

    const { payload } = await jwtDecrypt(token, encryptionKey, {
      clockTolerance: 15,
    });

    const email = payload.email as string | undefined;
    if (!email) return null;

    // Check cache to avoid concurrent upserts causing SQLite locks
    const cached = userCache.get(email);
    if (cached && Date.now() < cached.expires) {
      return cached.user;
    }

    // Upsert: create local user record on first visit
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: (payload.name as string) ?? null },
      create: {
        email,
        name: (payload.name as string) ?? null,
        image: (payload.picture as string) ?? null,
      },
    });

    const authUser = { id: user.id, email: user.email, name: user.name };
    userCache.set(email, { user: authUser, expires: Date.now() + CACHE_TTL });
    return authUser;
  } catch (error) {
    console.error("Error reading session:", error);
    return null;
  }
}
