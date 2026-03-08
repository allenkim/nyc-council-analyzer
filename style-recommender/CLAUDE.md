# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

AI-powered personal style recommender. Users complete a visual quiz (body, lifestyle, preferences, style identity) and upload selfies. AI analysis is performed asynchronously via a local worker agent (Koko) that polls a task queue. The app generates a comprehensive style profile with color season, Kibbe type, and wardrobe recommendations. Additional features: discovery feed with swipeable item suggestions, outfit check (upload a photo for AI feedback), and PDF profile export.

## Commands

```bash
npm run dev          # Start dev server at localhost:3001
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

**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + Prisma 7 + LibSQL (SQLite) + @react-pdf/renderer + Zod

**Data flow:** UI (Server/Client Components) -> API Routes (`src/app/api/`) -> Task Queue (StyleTask) -> Local Worker (Koko) -> AI Models (Claude/Gemini) -> Results written back to DB

### Queue-Based AI Processing

The server does NOT call Claude/Gemini directly. Instead:

1. **Server** collects data (quiz answers, uploaded images) and creates a `StyleTask` record with status `pending`
2. **Worker** (`worker/style_worker.py`) polls `GET /style/api/internal/tasks/pending` every 15s
3. **Worker** runs Claude/Gemini locally via Claude Code CLI (`claude -p`)
4. **Worker** pushes results back via `PUT /style/api/internal/tasks/{id}` with status `completed`
5. **Server** completion handler applies results to the target record (SelfieUpload, StyleProfile, FeedItem, OutfitCheck)
6. **Frontend** polls `GET /style/api/tasks/{id}` until the task reaches a terminal state

Task types: `selfie_analysis`, `profile_generation`, `feed_generation`, `outfit_check`

### Auth

- **No local OAuth config.** Uses site-wide Google OAuth via Caddy `forward_auth`. Caddy ensures only authenticated users reach this app.
- Reads the NextAuth JWT cookie (set by the finance app) via `getToken` from `next-auth/jwt` in `src/lib/session.ts`.
- `NEXTAUTH_SECRET` must match the finance app's `AUTH_SECRET` so the JWT can be decoded.
- On first visit, `getUser()` upserts a local User record from the JWT claims (email, name, image).
- Internal worker endpoints (`/api/internal/tasks/*`) use Bearer token auth via `WORKER_TOKEN`.

### Key directories

- `src/app/` — Next.js App Router pages (`quiz/`, `profile/`, `discover/`, `check/`) and API routes
- `src/app/api/` — REST API endpoints: `quiz/` (save answers), `quiz/selfie/` (upload + queue analysis), `profile/` (queue generation), `profile/pdf/` (export PDF), `feed/` (queue item generation), `feed/interact/` (heart/skip/save), `outfit-check/` (upload + queue feedback), `tasks/[id]` (frontend polling), `internal/tasks/` (worker endpoints), `images/` (local image serving)
- `src/components/` — React components organized by feature
- `src/lib/` — Core utilities:
  - `storage.ts` — Local image storage (saveImage, readImage, deleteImage)
  - `session.ts` — `getUser()` reads NextAuth JWT, upserts local User record
  - `db.ts` — Prisma singleton with LibSQL adapter
  - `prompts.ts` — All AI prompt templates
  - `quiz-definitions.ts` — Quiz sections, questions, and visual-grid image queries
  - `use-task-poll.ts` — React hook for polling task status from frontend
- `prisma/` — Schema, migrations, dev.db

### Image Storage

Images stored locally on the server filesystem (not Google Drive):
- Storage path: `{DATA_DIR}/images/` (DATA_DIR defaults to `./data`)
- Subfolders: `selfies/`, `outfits/`, `feed/`, `quiz-assets/`
- DB stores relative paths (e.g. `selfies/abc123.jpg`)
- Served via `/api/images/[...path]` route (auth-gated)

### Database

SQLite via LibSQL adapter. DB file at `prisma/dev.db`. 8 models:

- **User** — email, name, image; auto-created from JWT on first visit
- **QuizResponse** — answers per category; JSON blob; unique per user+category
- **SelfieUpload** — imagePath, Claude + Gemini analysis results (JSON)
- **StyleProfile** — per-model profiles (Claude/Gemini), merged profile, extracted fields
- **FeedItem** — brand, item name, category, price range, AI rationale, batchId
- **FeedInteraction** — heart/skip/save actions; unique per user+feedItem
- **OutfitCheck** — uploaded outfit imagePath, Claude + Gemini feedback (JSON)
- **StyleTask** — task queue: type, status, payload (JSON), result (JSON), targetId

### Patterns

- **Server Components** render pages; **Client Components** (`"use client"`) handle interactivity
- All API routes check auth via `getUser()` and return 401 if null
- Internal worker routes check auth via `WORKER_TOKEN` Bearer token
- AI operations create a `StyleTask` (pending) → worker processes → completion handler updates target record
- Frontend uses `useTaskPoll()` hook to poll task status with 3s interval
- All data is scoped to authenticated user via `userId` foreign keys
- DB singleton in `src/lib/db.ts` — import as `import { prisma } from "@/lib/db"`

## Docker

- **Must use `node:22-slim` (Debian), NOT `node:22-alpine`** — The `@libsql` native module requires glibc.
- **Must install OpenSSL** — Prisma requires libssl in `node:22-slim`.
- Port **3001** (not 3000, to avoid conflict with finance app).
- `DATABASE_URL` is set via `docker-compose.yml` to `file:/app/data/style.db` (persistent volume).
- `DATA_DIR` defaults to `/app/data` in Docker (images stored at `/app/data/images/`).
- `prisma migrate deploy` runs on every container startup (idempotent).
- Standalone output mode (`output: "standalone"` in `next.config.ts`).

## Environment

Required environment variables:

- **Auth**: `NEXTAUTH_SECRET` (must match finance app's `AUTH_SECRET`)
- **Database**: `DATABASE_URL` (default `file:prisma/dev.db` for local dev)
- **Worker**: `WORKER_TOKEN` (shared secret for worker authentication)
- **Storage**: `DATA_DIR` (optional, default `./data`)
- **Next.js basePath**: Configured to `/style` in `next.config.ts`

## Worker (Koko)

AI task processing runs locally on your machine via the **Koko** agent (`~/koko`), not on the server.

- Koko's `src/style-worker.ts` polls `GET /style/api/internal/tasks/pending` every 15s
- **Gemini** (`@google/generative-ai`): handles image tasks (selfie analysis, outfit check)
- **Claude** (`claude -p` CLI): handles text tasks (profile generation, feed generation)
- For image tasks, Gemini goes first, then Claude gets Gemini's findings as a second opinion
- Results pushed back via `PUT /style/api/internal/tasks/{id}`
- Env vars in Koko's `.env`: `STYLE_API_BASE_URL`, `STYLE_WORKER_TOKEN`, `GEMINI_API_KEY`
