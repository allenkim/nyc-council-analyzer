import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { isEmailAllowed } from "@/lib/allowlist";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, secureCookie: true });
  const email = token?.email as string | undefined;

  if (!email || !(await isEmailAllowed(email))) {
    const originalUri = req.headers.get("x-forwarded-uri") || "/";
    return new Response(null, {
      status: 302,
      headers: { Location: `/login?callbackUrl=${encodeURIComponent(originalUri)}` },
    });
  }

  return new Response(null, { status: 200 });
}
