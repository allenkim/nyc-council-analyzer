import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ALLOWED_EMAILS } from "@/lib/allowlist";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  console.log("[middleware]", { pathname, url: req.url, nextUrlHref: req.nextUrl.href });

  // Allow auth API routes and login page without session
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/finance/api/auth") ||
    pathname === "/login" ||
    pathname === "/finance/login"
  ) {
    console.log("[middleware] allowing auth/login path");
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = token?.email as string | undefined;

  console.log("[middleware] token email:", email);

  if (!email || !ALLOWED_EMAILS.includes(email)) {
    const loginUrl = new URL("/finance/login", req.url);
    console.log("[middleware] redirecting to:", loginUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
