import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

const TEST_COOKIE = "style-test-session";
const TEST_EMAIL = "test@whatisms.com";
const TEST_NAME = "Test User";

/**
 * POST /api/auth/test-login — Create a test session for QA.
 * Only available when TEST_LOGIN_SECRET env var is set.
 * Requires matching secret in request body.
 *
 * Sets a simple HMAC-signed cookie that getUser() checks,
 * bypassing the Auth.js JWT + Caddy forward_auth flow.
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

  // Upsert test user
  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: { name: TEST_NAME },
    create: { email: TEST_EMAIL, name: TEST_NAME },
  });

  // Create HMAC-signed token: email.signature
  const sig = createHmac("sha256", testSecret).update(TEST_EMAIL).digest("hex");
  const token = `${TEST_EMAIL}.${sig}`;

  const cookieStore = await cookies();
  cookieStore.set(TEST_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return NextResponse.json({ ok: true, email: user.email });
}
