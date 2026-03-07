# Unified Google OAuth for whatisms.com

## Overview

Replace all per-app authentication with a single Google OAuth gate at the Caddy reverse proxy layer. The Next.js finance app (which already has NextAuth + Google OAuth) serves as the auth provider. Caddy's `forward_auth` checks every request against it.

## Architecture

| Concern | Handled by |
|---------|-----------|
| Authentication | Caddy `forward_auth` -> Next.js NextAuth |
| Portal page (`/`) | Static HTML served by Caddy |
| Login page (`/login`) | Static HTML served by Caddy |
| District2 dashboard (`/district2*`) | FastAPI (no auth, trusts Caddy) |
| Finance tracker (`/finance*`) | Next.js (keeps per-user data isolation) |

## Request Flow

```
User -> Caddy
         |-- /login, /finance/api/auth/* -> pass through (no auth check)
         |-- static assets (_next/*, /static/*) -> pass through
         +-- everything else -> forward_auth to /finance/api/auth/session
                                  |-- valid session -> forward to target service
                                  +-- no session -> redirect to /login?callbackUrl=<original-url>
```

## Changes by Component

### 1. Caddyfile

- Add `forward_auth` pointing to Next.js session endpoint
- Serve `/login` and `/` from static HTML files
- Route `/district2*` to district2, `/finance*` to finance (as today)

### 2. Static pages (new, served by Caddy)

- `/login` -- "Sign in with Google" button, triggers NextAuth OAuth flow
- `/` -- Portal page with project cards; fetches user info from `/finance/api/auth/session` client-side

### 3. District2 (FastAPI)

- Remove `AuthMiddleware`, login route, session/user management code
- Keep all dashboard functionality untouched
- No more `/login` page (handled by Caddy static file)

### 4. Finance (Next.js)

- Add `/api/auth/check` endpoint returning 200 (authenticated) or 401 (for Caddy `forward_auth`)
- Adjust NextAuth `callbackUrl` handling to support site-wide redirects
- Keep existing per-user data isolation, middleware, everything else

## What Stays the Same

- Google OAuth credentials and NextAuth config
- Finance per-user data model (Prisma `userId` on everything)
- Docker compose structure and networking
- District2 dashboard features

## Verification

Commit, push, deploy to server, then test the full flow with Playwright:
- Unauthenticated redirect to `/login`
- Google sign-in flow
- Portal page loads with user info
- Navigation to both district2 and finance works
- Unauthenticated API requests are blocked
