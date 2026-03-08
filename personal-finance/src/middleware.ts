import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow auth API routes and login page without session
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/finance/api/auth") ||
    pathname === "/login" ||
    pathname === "/finance/login"
  ) {
    return NextResponse.next();
  }

  // Check for valid JWT — the signIn callback already verified the allowlist
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, secureCookie: true });

  if (!token?.email) {
    const loginUrl = new URL("/finance/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
