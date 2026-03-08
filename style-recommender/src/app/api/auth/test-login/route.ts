import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EncryptJWT } from "jose";
import { hkdf } from "@panva/hkdf";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "__Secure-authjs.session-token";
const TEST_EMAIL = "test@whatisms.com";
const TEST_NAME = "Test User";

async function getEncryptionKey(secret: string, salt: string): Promise<Uint8Array> {
  return new Uint8Array(
    await hkdf("sha256", secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64)
  );
}

/**
 * POST /api/auth/test-login — Create a test session for QA.
 * Only available when TEST_LOGIN_SECRET env var is set.
 * Requires matching secret in request body.
 */
export async function POST(request: Request) {
  const testSecret = process.env.TEST_LOGIN_SECRET;
  if (!testSecret) {
    return NextResponse.json({ error: "Test login not enabled" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.secret !== testSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  const authSecret = process.env.NEXTAUTH_SECRET;
  if (!authSecret) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  // Upsert test user
  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: { name: TEST_NAME },
    create: { email: TEST_EMAIL, name: TEST_NAME },
  });

  // Create JWT matching Auth.js v5 format
  const key = await getEncryptionKey(authSecret, COOKIE_NAME);
  const token = await new EncryptJWT({
    email: user.email,
    name: user.name,
    sub: user.id,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .setJti(crypto.randomUUID())
    .encrypt(key);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return NextResponse.json({ ok: true, email: user.email });
}
