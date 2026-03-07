import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

// Next.js strips the basePath ("/finance") from request.url before the route
// handler sees it. NextAuth needs the full URL (with basePath) to construct
// correct callback URLs and parse actions. Re-add the prefix here.
function withBasePath(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/finance")) {
    url.pathname = "/finance" + url.pathname;
  }
  return new NextRequest(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
    duplex: "half",
  });
}

export async function GET(req: NextRequest) {
  return handlers.GET(withBasePath(req) as never);
}

export async function POST(req: NextRequest) {
  return handlers.POST(withBasePath(req) as never);
}
