import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow auth API routes and login page without session
  if (pathname.startsWith("/api/auth") || pathname === "/login") {
    return;
  }

  // The `authorized` callback in authConfig handles the check.
  // If we reach here without auth, redirect to login.
  if (!req.auth?.user) {
    return Response.redirect(new URL("/finance/login", req.url));
  }
});

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
