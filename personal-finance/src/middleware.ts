import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { ALLOWED_EMAILS } from "@/lib/allowlist";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const pathname = new URL(req.url).pathname;

  // Allow auth API routes and login page without session
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/finance/api/auth") ||
    pathname === "/login" ||
    pathname === "/finance/login"
  ) {
    return;
  }

  const email = req.auth?.user?.email;

  // Not signed in — redirect to login
  if (!email) {
    return Response.redirect(new URL("/finance/login", req.url));
  }

  // Signed in but not on allowlist
  if (!ALLOWED_EMAILS.includes(email)) {
    return new Response("Access denied", { status: 403 });
  }
});

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
