# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the `whatisms` monorepo — all projects hosted on whatisms.com.

## Projects

| Project | Stack | Path on Site | CLAUDE.md |
|---------|-------|-------------|-----------|
| District 2 Dashboard | Python FastAPI + vanilla JS | `/district2` | `district2-dashboard/CLAUDE.md` |
| Personal Finance | Next.js 16 + Prisma 7 + SQLite | `/finance` | `personal-finance/CLAUDE.md` |
| Style Recommender | Next.js 16 + Prisma 7 + SQLite + Claude + Gemini | `/style` | `style-recommender/CLAUDE.md` |

Each project has its own CLAUDE.md with detailed architecture, commands, and patterns. Read the relevant one before working on a project.

## Deployment

All services are deployed on the same machine (whatisms.com) via Docker Compose. From the repo root:

```bash
docker compose build && docker compose up -d
```

- Caddy reverse proxy routes `/finance*` → `finance:3000`, `/style*` → `style:3001`, everything else → `district2:8050`
- Each project has its own `Dockerfile` in its directory
- Persistent volumes use `name:` keys to preserve existing Docker data
- Caddy auto-provisions TLS via Let's Encrypt
- Security headers (CSP, HSTS, X-Frame-Options) are set in the Caddyfile

## Auth Architecture

Two independent auth systems, plus shared forward_auth:

1. **Portal auth** (district2-dashboard backend): Session-based with httponly cookies. The portal at `/` shows tiles for all projects the user has access to. Admins see all projects automatically. Default admin: `allen`/`allen1729` (seeded on first run).

2. **Finance auth** (NextAuth v5): Google OAuth with email allowlist (`src/lib/allowlist.ts`). JWT sessions. Auth API lives at `/finance/api/auth/*`, login page at `/finance/login`. Middleware protects all routes except auth endpoints and login.

3. **Style Recommender auth**: No local OAuth. Uses Caddy `forward_auth` against the finance app's `/finance/api/auth/check` endpoint. Reads the NextAuth JWT cookie via `getToken` with shared `NEXTAUTH_SECRET`.

## Key Infrastructure Details

- `docker-compose.yml` — 4 services: `district2` (port 8050), `finance` (port 3000), `style` (port 3001), `caddy` (ports 80/443)
- `Caddyfile` — Reverse proxy config + security headers + static asset caching
- CSP allows: Plaid, SnapTrade, Leaflet tile servers, Cloudflare Insights, unpkg/jsdelivr CDNs, Google Drive (images)
