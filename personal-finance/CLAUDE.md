# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal finance tracker built with Next.js 16 (App Router), Prisma with LibSQL/SQLite, Plaid for bank account syncing, and SnapTrade for brokerage connections. Authenticated via NextAuth v5 with Google OAuth and email allowlist.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint (v9 flat config)

# Database
npx prisma migrate dev              # Apply migrations / create new migration
npx prisma migrate dev --name <name> # Create named migration
npx prisma generate                  # Regenerate Prisma client after schema changes
npx prisma studio                    # Visual database browser
```

Prisma client is generated to `src/generated/prisma/` (not `node_modules`). After any `schema.prisma` change, run both `prisma migrate dev` and `prisma generate`.

## Architecture

**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + Prisma 7 + LibSQL (SQLite) + NextAuth v5 + Plaid API + SnapTrade + Recharts + Anthropic SDK

**Data flow:** UI (Server/Client Components) → API Routes (`src/app/api/`) → Prisma ORM → SQLite (`prisma/dev.db`)

### Auth

- NextAuth v5 (beta) with Google OAuth provider
- Email allowlist in `src/lib/allowlist.ts` — only listed emails can sign in
- Edge-compatible config split: `src/lib/auth.config.ts` (middleware/edge) vs `src/lib/auth.ts` (server, with Prisma)
- `basePath: "/finance/api/auth"` — all auth routes are prefixed for the reverse proxy
- Middleware (`src/middleware.ts`) protects all routes except `/api/auth/*` and `/login`
- JWT sessions (no database sessions)

### Key directories

- `src/app/` — Next.js App Router pages and API routes
- `src/app/api/` — REST API endpoints (plaid/, accounts/, holdings/, transactions/, snapshots/, budgets/, bills/, credit-score/, insights/)
- `src/components/` — Shared React components
- `src/lib/` — Utilities: `db.ts` (Prisma singleton), `plaid.ts` (Plaid client), `categories.ts` (category definitions), `auth.ts`/`auth.config.ts` (NextAuth), `allowlist.ts` (authorized emails)
- `prisma/schema.prisma` — Database schema (15 models)

### Patterns

- **Server Components** fetch data directly via Prisma (pages like dashboard, spending, budgets)
- **Client Components** (`"use client"`) handle interactivity (forms, charts, Plaid Link)
- Pages that need fresh data use `export const dynamic = "force-dynamic"`
- DB singleton in `src/lib/db.ts` — import as `import { prisma } from "@/lib/db"`
- Plaid integration: create link token → user connects via Plaid Link → exchange for access token → sync holdings/transactions
- SnapTrade integration: for brokerages not supported by Plaid (e.g. Fidelity). Create login link → user connects → sync holdings
- All data is scoped to authenticated user via `userId` foreign keys

### Database

SQLite via LibSQL adapter. DB file at `prisma/dev.db`. Key models: User, PlaidItem, SnapTradeConnection, Account, Holding, Transaction, Snapshot, BudgetGoal, Bill, CreditScore, CostBasis, FinancialGoal, CategoryRule, Insight.

Transaction amounts: positive = money out, negative = money in (Plaid convention).

## Docker

- **Must use `node:22-slim` (Debian), NOT `node:22-alpine`** — The `@libsql` native module requires glibc. Alpine uses musl libc, which causes `fcntl64: symbol not found` at build time during Next.js page data collection.
- **Must install OpenSSL** — Prisma requires libssl in `node:22-slim`. Add `apt-get update -y && apt-get install -y openssl` before `npm ci`.
- `DATABASE_URL` is set via `docker-compose.yml` to `file:/app/data/finance.db` (persistent volume). `db.ts` falls back to `file:prisma/dev.db` for local dev.
- `prisma migrate deploy` runs on every container startup (idempotent).

## Environment

Copy `env.example` to `.env` and fill in credentials:
- **Plaid**: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (sandbox/development/production)
- **SnapTrade**: `SNAPTRADE_CLIENT_ID`, `SNAPTRADE_CONSUMER_KEY`
- **NextAuth**: `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Next.js basePath**: Configured to `/finance` in `next.config.ts` — all routes and API endpoints are prefixed with `/finance`
