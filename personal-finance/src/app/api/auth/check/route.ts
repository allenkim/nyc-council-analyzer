import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { ALLOWED_EMAILS } from "@/lib/allowlist";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = token?.email as string | undefined;

  if (!email || !ALLOWED_EMAILS.includes(email)) {
    const originalUri = req.headers.get("x-forwarded-uri") || "/";
    return new Response(null, {
      status: 302,
      headers: { Location: `/login?callbackUrl=${encodeURIComponent(originalUri)}` },
    });
  }

  return new Response(null, { status: 200 });
}
