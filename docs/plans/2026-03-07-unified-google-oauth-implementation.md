# Unified Google OAuth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace per-app auth with a single Google OAuth gate at the Caddy proxy layer, using the existing NextAuth setup in the finance app as the auth provider.

**Architecture:** Caddy `forward_auth` checks every request against a Next.js auth endpoint. Static HTML pages for login (`/login`) and portal (`/`). District2 strips all auth and trusts Caddy. Finance keeps its per-user data isolation.

**Tech Stack:** Caddy v2 (forward_auth), Next.js 16 + NextAuth v5, FastAPI, static HTML/CSS/JS

---

### Task 1: Add Auth Check Endpoint to Next.js

The Caddy `forward_auth` directive needs an endpoint that returns 200 (authenticated) or 302 redirect to login (not authenticated). This endpoint validates the NextAuth JWT cookie.

**Files:**
- Create: `personal-finance/src/app/api/auth/check/route.ts`

**Step 1: Create the auth check endpoint**

```typescript
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
```

Key details:
- Uses `getToken` (same as middleware) — Edge-compatible, no Prisma dependency
- Reads `X-Forwarded-Uri` header set by Caddy's `forward_auth` to construct the callbackUrl
- Returns relative `/login?callbackUrl=...` URL — browser resolves against `whatisms.com`
- Already exempted from finance middleware because path starts with `/api/auth`

**Step 2: Verify it doesn't break existing auth**

Run: `cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/app/api/auth/check/route.ts
git commit -m "feat: add /api/auth/check endpoint for Caddy forward_auth"
```

---

### Task 2: Create Static Login Page

A standalone HTML page at `/login` with a "Sign in with Google" button. Uses NextAuth's CSRF token + form POST to initiate OAuth.

**Files:**
- Create: `static/login.html`

**Step 1: Create the login page**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In — Whatisms</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0b0e14;
            color: #e6edf3;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .login-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 40px;
            width: 100%;
            max-width: 400px;
            margin: 20px;
            text-align: center;
        }
        .login-card h1 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #f0f6fc;
            margin-bottom: 8px;
        }
        .login-card .subtitle {
            color: #8b949e;
            font-size: 0.875rem;
            margin-bottom: 28px;
        }
        .btn-google {
            width: 100%;
            padding: 12px 16px;
            background: #f0f6fc;
            color: #0b0e14;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: opacity 0.2s;
        }
        .btn-google:hover { opacity: 0.9; }
        .btn-google:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-msg {
            background: rgba(248, 81, 73, 0.1);
            border: 1px solid rgba(248, 81, 73, 0.4);
            color: #f85149;
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 0.875rem;
            margin-bottom: 16px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <h1>Whatisms</h1>
        <p class="subtitle">Sign in with your Google account to continue.</p>
        <div class="error-msg" id="error"></div>
        <button class="btn-google" id="btn-google" onclick="signInWithGoogle()">
            <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
        </button>
    </div>
    <script>
        async function signInWithGoogle() {
            const btn = document.getElementById('btn-google');
            const errEl = document.getElementById('error');
            btn.disabled = true;
            btn.textContent = 'Redirecting...';
            errEl.style.display = 'none';

            try {
                // Get CSRF token from NextAuth
                const csrfResp = await fetch('/finance/api/auth/csrf');
                const { csrfToken } = await csrfResp.json();

                // Get callbackUrl from URL params (set by forward_auth redirect)
                const params = new URLSearchParams(window.location.search);
                const callbackUrl = params.get('callbackUrl') || '/';

                // Submit form to NextAuth Google sign-in
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '/finance/api/auth/signin/google';

                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrfToken';
                csrfInput.value = csrfToken;
                form.appendChild(csrfInput);

                const cbInput = document.createElement('input');
                cbInput.type = 'hidden';
                cbInput.name = 'callbackUrl';
                cbInput.value = callbackUrl;
                form.appendChild(cbInput);

                document.body.appendChild(form);
                form.submit();
            } catch (err) {
                errEl.textContent = 'Failed to initiate sign-in. Please try again.';
                errEl.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Sign in with Google';
            }
        }
    </script>
</body>
</html>
```

Key details:
- Matches the existing dark theme from district2 login page
- Fetches CSRF token from `/finance/api/auth/csrf` before submitting
- Reads `callbackUrl` from URL query params (set by the auth check redirect)
- Submits a form POST to `/finance/api/auth/signin/google` — standard NextAuth flow
- After Google OAuth completes, NextAuth redirects to the callbackUrl

**Step 2: Commit**

```bash
cd /Users/allen/whatisms
git add static/login.html
git commit -m "feat: add static Google OAuth login page"
```

---

### Task 3: Create Static Portal Page

The landing page at `/` showing project cards. Fetches user info from NextAuth session endpoint.

**Files:**
- Create: `static/portal.html`

**Step 1: Create the portal page**

Replicate the existing portal design from `district2-dashboard/frontend/pages/portal.html` but:
- Remove: Change Password button/modal, Admin link, Sign Out using district2 auth
- Replace: Sign Out uses NextAuth signout, user info from `/finance/api/auth/session`
- Hardcode: Project cards (no dynamic project loading from district2 DB)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portal — Whatisms</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0b0e14;
            color: #e6edf3;
            min-height: 100vh;
        }
        .portal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 32px;
            background: rgba(19, 23, 32, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid #252d3a;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .portal-header h1 {
            font-size: 1.15rem;
            font-weight: 700;
            color: #e6edf3;
            letter-spacing: -0.02em;
        }
        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header-actions span {
            color: #8b949e;
            font-size: 0.875rem;
        }
        .btn-signout {
            padding: 6px 14px;
            background: transparent;
            border: 1px solid #da3633;
            color: #f85149;
            border-radius: 6px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-signout:hover {
            background: rgba(218, 54, 51, 0.15);
        }
        .portal-container {
            max-width: 960px;
            margin: 0 auto;
            padding: 64px 32px;
        }
        .portal-greeting { margin-bottom: 48px; }
        .portal-greeting h2 {
            font-size: 2rem;
            font-weight: 300;
            color: #e6edf3;
            letter-spacing: -0.03em;
            line-height: 1.2;
        }
        .portal-greeting h2 strong { font-weight: 600; }
        .portal-greeting p {
            color: #7d8ba0;
            font-size: 0.95rem;
            margin-top: 8px;
        }
        .section-label {
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #5b8def;
            margin-bottom: 16px;
        }
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
        }
        .project-tile {
            position: relative;
            background: #131720;
            border: 1px solid #252d3a;
            border-radius: 16px;
            padding: 28px;
            text-decoration: none;
            color: inherit;
            transition: all 0.25s ease;
            display: flex;
            flex-direction: column;
            gap: 16px;
            overflow: hidden;
        }
        .project-tile::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--tile-accent, #5b8def), transparent);
            opacity: 0;
            transition: opacity 0.25s;
        }
        .project-tile:hover {
            border-color: #3d4b63;
            transform: translateY(-3px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        }
        .project-tile:hover::before { opacity: 1; }
        .tile-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }
        .project-tile h3 {
            font-size: 1.1rem;
            font-weight: 600;
            color: #e6edf3;
            letter-spacing: -0.01em;
        }
        .project-tile p {
            font-size: 0.875rem;
            color: #7d8ba0;
            line-height: 1.6;
        }
        .tile-arrow {
            color: #3d4b63;
            transition: all 0.25s;
            margin-left: auto;
        }
        .project-tile:hover .tile-arrow {
            color: #5b8def;
            transform: translateX(3px);
        }
        @media (max-width: 640px) {
            .portal-container { padding: 32px 20px; }
            .portal-greeting h2 { font-size: 1.5rem; }
            .projects-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="portal-header">
        <h1>Whatisms</h1>
        <div class="header-actions">
            <span id="user-display"></span>
            <button class="btn-signout" id="signout-btn">Sign Out</button>
        </div>
    </div>
    <div class="portal-container">
        <div class="portal-greeting">
            <h2>Welcome back<span id="greeting-name"></span></h2>
            <p>Select a project to get started.</p>
        </div>
        <div class="section-label">Your Projects</div>
        <div class="projects-grid">
            <a href="/district2" class="project-tile" style="--tile-accent: #5b8def;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div class="tile-icon" style="background:rgba(91,141,239,0.12)">&#x1f5fd;</div>
                    <svg class="tile-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <div>
                    <h3>NYC Council District 2</h3>
                    <p>Real-time intelligence dashboard for the Lower East Side, East Village, Greenwich Village, and surrounding neighborhoods.</p>
                </div>
            </a>
            <a href="/finance" class="project-tile" style="--tile-accent: #3fb950;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div class="tile-icon" style="background:rgba(63,185,80,0.12)">&#x1f4b0;</div>
                    <svg class="tile-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <div>
                    <h3>Personal Finance</h3>
                    <p>Personal finance tracker with Plaid bank syncing, budgets, and spending insights.</p>
                </div>
            </a>
        </div>
    </div>
    <script>
        // Load user info from NextAuth session
        async function loadUser() {
            try {
                const resp = await fetch('/finance/api/auth/session');
                const session = await resp.json();
                if (session?.user?.name) {
                    const name = session.user.name.split(' ')[0];
                    document.getElementById('greeting-name').textContent = ', ' + name;
                    document.getElementById('user-display').textContent = session.user.email;
                }
            } catch (e) {
                // Session info is non-critical — page works without it
            }
        }

        // Sign out via NextAuth
        async function signOut() {
            try {
                const csrfResp = await fetch('/finance/api/auth/csrf');
                const { csrfToken } = await csrfResp.json();

                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '/finance/api/auth/signout';

                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrfToken';
                csrfInput.value = csrfToken;
                form.appendChild(csrfInput);

                const cbInput = document.createElement('input');
                cbInput.type = 'hidden';
                cbInput.name = 'callbackUrl';
                cbInput.value = '/login';
                form.appendChild(cbInput);

                document.body.appendChild(form);
                form.submit();
            } catch (e) {
                window.location.href = '/login';
            }
        }

        document.getElementById('signout-btn').addEventListener('click', signOut);
        loadUser();
    </script>
</body>
</html>
```

Key details:
- Project cards are hardcoded (not loaded from DB) — simpler, no API dependency
- User info fetched from `/finance/api/auth/session` (non-critical, page works without it)
- Sign out POSTs to NextAuth's signout endpoint with CSRF token
- Exact same visual design as the existing portal page

**Step 2: Commit**

```bash
cd /Users/allen/whatisms
git add static/portal.html
git commit -m "feat: add static portal page with project cards"
```

---

### Task 4: Update Caddyfile

Add `forward_auth` for all protected routes. Serve static login and portal pages. The key constraint: Caddy's `forward_auth` passes the response through when non-2xx, so our auth check's 302 redirect goes straight to the browser.

**Files:**
- Modify: `Caddyfile`

**Step 1: Rewrite the Caddyfile**

```caddy
whatisms.com {
    # ── Public: login page (no auth) ──────────────────────────────────
    handle /login {
        root * /var/www/static
        rewrite * /login.html
        file_server
    }

    # ── Public: NextAuth endpoints (needed for OAuth flow) ────────────
    handle /finance/api/auth/* {
        reverse_proxy finance:3000
    }

    # ── Protected: finance app ────────────────────────────────────────
    handle /finance* {
        forward_auth finance:3000 {
            uri /finance/api/auth/check
        }
        reverse_proxy finance:3000
    }

    # ── Protected: everything else (portal + district2) ───────────────
    handle {
        route {
            # Auth check first (order enforced by route block)
            forward_auth finance:3000 {
                uri /finance/api/auth/check
            }

            # Root path: serve portal page
            @root path /
            handle @root {
                root * /var/www/static
                rewrite * /portal.html
                file_server
            }

            # All other paths: proxy to district2
            handle {
                reverse_proxy district2:8050
            }
        }
    }

    # ── Security headers ──────────────────────────────────────────────
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://cdn.plaid.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; connect-src 'self' https://*.plaid.com; frame-src 'self' https://cdn.plaid.com https://app.snaptrade.com; font-src 'self'"
        -Server
    }

    header /static/* Cache-Control "public, max-age=31536000, immutable"

    log {
        output stdout
        format json { time_format iso8601 }
    }

    encode gzip
}
```

Key details:
- `handle /login` — most specific, matches before the catchall
- `handle /finance/api/auth/*` — NextAuth endpoints pass through without auth check
- `handle /finance*` — finance app with forward_auth
- `handle` (catchall) — uses `route` block to enforce directive ordering:
  1. `forward_auth` runs first — if unauthenticated, 302 response short-circuits
  2. `@root` handle serves portal.html for `/`
  3. Fallback handle proxies everything else to district2

**Step 2: Commit**

```bash
cd /Users/allen/whatisms
git add Caddyfile
git commit -m "feat: add forward_auth and static page serving to Caddyfile"
```

---

### Task 5: Update Docker Compose

Mount the static directory into the Caddy container.

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Add static volume mount to Caddy service**

In the `caddy` service, add the static directory mount:

```yaml
caddy:
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile:ro
    - ./static:/var/www/static:ro          # <-- ADD THIS LINE
    - caddy-data:/data
    - caddy-config:/config
```

No other changes needed.

**Step 2: Commit**

```bash
cd /Users/allen/whatisms
git add docker-compose.yml
git commit -m "feat: mount static directory in Caddy container"
```

---

### Task 6: Strip District2 Auth

Remove all authentication code from the district2 FastAPI app. Caddy handles auth now.

**Files:**
- Delete: `district2-dashboard/backend/auth.py`
- Delete: `district2-dashboard/frontend/pages/login.html`
- Delete: `district2-dashboard/frontend/pages/admin.html`
- Delete: `district2-dashboard/frontend/pages/portal.html`
- Modify: `district2-dashboard/backend/app.py`
- Modify: `district2-dashboard/backend/db.py`
- Modify: `district2-dashboard/frontend/index.html`
- Modify: `district2-dashboard/frontend/js/suggestions.js`

**Step 1: Delete auth module and obsolete pages**

```bash
cd /Users/allen/whatisms
rm district2-dashboard/backend/auth.py
rm district2-dashboard/frontend/pages/login.html
rm district2-dashboard/frontend/pages/admin.html
rm district2-dashboard/frontend/pages/portal.html
```

**Step 2: Clean up app.py**

Remove from `district2-dashboard/backend/app.py`:

a) Remove `import auth` (line 45)

b) Remove `AuthMiddleware` class and registration (lines 84-123):
   - Delete `PUBLIC_PATHS` dict
   - Delete `AuthMiddleware` class
   - Delete `app.add_middleware(AuthMiddleware)`

c) Remove auth-related page routes (lines 140-157):
   - Delete `/login` route
   - Delete `/` (portal) route
   - Delete `/admin` route
   - Keep `/district2` route — still serves the dashboard HTML

d) Remove auth models and routes (lines 162-263):
   - Delete `LoginRequest`, `PasswordChangeRequest` models
   - Delete all `/auth/*` routes (login, logout, me, password)
   - Delete `CreateUserRequest`, `UpdateProjectsRequest` models
   - Delete all `/admin/api/*` routes

e) Fix suggestion routes (lines 409-448) — remove `request.state.user` references:
   - `create_suggestion`: Change `user["id"]` to a hardcoded default (e.g., `1`)
   - `update_suggestion`: Remove admin role check, allow all operations
   - `delete_suggestion`: Remove admin role check, allow all operations
   - `get_suggestions`: The SQL JOINs on `users` table — change to LEFT JOIN or remove the JOIN

f) Remove `BaseHTTPMiddleware` from imports (line 19) if no longer used

**Step 3: Clean up db.py**

In `district2-dashboard/backend/db.py`:

a) Remove from SCHEMA string (lines 190-221):
   - `users` table
   - `sessions` table and indexes
   - `projects` table
   - `user_projects` table

b) Update `suggestions` table schema — change `submitted_by` to not reference `users`:
   ```sql
   submitted_by INTEGER NOT NULL DEFAULT 0,
   ```

c) Remove from `init_db()` (lines 291-315):
   - Admin user seeding
   - Default project seeding

d) Remove `import bcrypt` if only used for auth

**Step 4: Fix district2 frontend index.html**

In `district2-dashboard/frontend/index.html`, find and remove:
- Line ~459: `fetch('/auth/me')` call and the header user display logic
- Line ~468: `fetch('/auth/logout', ...)` sign out button logic
- Remove the sign-out button from the header HTML
- Keep the "Portal" link in the header (change to point to `/`)

**Step 5: Fix suggestions.js**

In `district2-dashboard/frontend/js/suggestions.js`:
- Line 13: Remove `fetch('/auth/me')` call
- Remove admin role checking logic
- Since user is always admin (sole user), show all admin controls unconditionally

**Step 6: Verify district2 starts without errors**

```bash
cd /Users/allen/whatisms/district2-dashboard
python -c "from backend.app import app; print('OK')"
```

**Step 7: Commit**

```bash
cd /Users/allen/whatisms
git add -A district2-dashboard/
git commit -m "feat: strip auth from district2, trust Caddy forward_auth"
```

---

### Task 7: Update Finance Health Check

The Docker health check currently hits `/finance/login`. This still works since the Next.js login page exists. But verify it's not affected by changes.

**Files:**
- No changes needed if `/finance/login` page still exists in Next.js

The finance app keeps its own login page at `/finance/login` as defense-in-depth. The Docker health check (`GET /finance/login`) continues to work. No changes needed.

---

### Task 8: Commit, Push, and Deploy

**Step 1: Final commit with all changes**

```bash
cd /Users/allen/whatisms
git status
# Verify all changes look correct
git log --oneline -5
```

**Step 2: Push to remote**

```bash
cd /Users/allen/whatisms
git push origin main
```

**Step 3: Deploy on server**

SSH to the Hetzner server at 5.161.201.173:

```bash
ssh allen@5.161.201.173
cd ~/whatisms
git pull origin main
docker compose build
docker compose up -d
docker compose logs --tail=50 caddy
docker compose logs --tail=50 finance
docker compose logs --tail=50 district2
```

Watch for:
- Caddy starts without config errors
- Finance container healthy (check `/finance/login`)
- District2 container healthy (check `/api/status`)

**Step 4: Quick smoke test**

```bash
# From server: test auth check returns 302 (no cookie)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/finance/api/auth/check
# Expected: 302

# Test login page is served
curl -s -o /dev/null -w "%{http_code}" https://whatisms.com/login
# Expected: 200

# Test root redirects to login (no session)
curl -s -o /dev/null -w "%{http_code}" -L https://whatisms.com/
# Expected: 302 -> /login
```

---

### Task 9: Verify with Playwright

Full end-to-end UI testing using Playwright MCP.

**Test plan:**

1. Navigate to `https://whatisms.com/` — should redirect to `/login?callbackUrl=/`
2. Verify login page shows "Whatisms" heading and Google sign-in button
3. Navigate to `https://whatisms.com/district2` — should redirect to `/login?callbackUrl=/district2`
4. Navigate to `https://whatisms.com/finance` — should redirect to `/login?callbackUrl=/finance`
5. Click "Sign in with Google" — should initiate OAuth flow
6. Complete Google sign-in — should redirect to callbackUrl
7. Verify portal page shows "Welcome back" with user name
8. Click "NYC Council District 2" card — should load district2 dashboard
9. Navigate to `/finance` — should load finance tracker
10. Click "Sign Out" — should redirect to `/login`
11. Verify accessing `/district2` after sign-out redirects to `/login`

---

### Potential Issues to Watch For

1. **Cookie path**: NextAuth session cookie must have `path=/` (not `/finance`). If the cookie only covers `/finance*`, the forward_auth check for `/district2` won't receive it. Verify by checking cookie in browser DevTools after login.

2. **NextAuth callbackUrl validation**: By default, NextAuth only allows redirects to same origin. Relative URLs like `/district2` should work (resolved as `baseUrl + /district2`). If it rejects non-`/finance` callbacks, add a custom `redirect` callback.

3. **Caddy directive ordering**: The `route` block in the catchall `handle` enforces execution order. Without `route`, Caddy re-sorts directives and `forward_auth` might not run before `handle` blocks.

4. **District2 static assets**: CSS/JS at `/static/*` goes through the catchall handle with `forward_auth`. This is fine — the browser has the session cookie. But if the login page tries to load `/static/*`, it would fail (since login has no auth). The login page uses inline styles, so this is not an issue.
