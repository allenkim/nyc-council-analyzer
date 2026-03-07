import { handlers } from "@/lib/auth";

// Next.js strips the basePath ("/finance") from request.url before the route
// handler sees it. NextAuth needs the full URL to parse actions and construct
// callback URLs correctly. Re-add the prefix here.
function withBasePath(req: Request): Request {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/finance")) {
    url.pathname = "/finance" + url.pathname;
  }
  return new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
    redirect: req.redirect,
    signal: req.signal,
    // @ts-expect-error duplex is needed for streaming body but not in all TS lib types
    duplex: "half",
  });
}

export async function GET(req: Request) {
  return handlers.GET(withBasePath(req) as never);
}

export async function POST(req: Request) {
  return handlers.POST(withBasePath(req) as never);
}
