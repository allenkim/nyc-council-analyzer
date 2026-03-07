# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

AI-powered personal style recommender. Users complete a visual quiz (body, lifestyle, preferences, style identity) and upload selfies, which are analyzed by dual AI models (Claude + Gemini). The app generates a comprehensive style profile with color season, Kibbe type, and wardrobe recommendations. Additional features: discovery feed with swipeable item suggestions, outfit check (upload a photo for AI feedback), Google Drive image storage, and PDF profile export.

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

**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + Prisma 7 + LibSQL (SQLite) + Anthropic SDK + Google Generative AI SDK + Google Drive API (googleapis) + @react-pdf/renderer + Zod

**Data flow:** UI (Server/Client Components) -> API Routes (`src/app/api/`) -> AI clients + Prisma ORM -> SQLite (`prisma/dev.db`)

### Auth

- **No local OAuth config.** Uses site-wide Google OAuth via Caddy `forward_auth`. Caddy ensures only authenticated users reach this app.
- Reads the NextAuth JWT cookie (set by the finance app) via `getToken` from `next-auth/jwt` in `src/lib/session.ts`.
- `NEXTAUTH_SECRET` must match the finance app's `AUTH_SECRET` so the JWT can be decoded.
- On first visit, `getUser()` upserts a local User record from the JWT claims (email, name, image).

### Key directories

- `src/app/` — Next.js App Router pages (`quiz/`, `profile/`, `discover/`, `check/`) and API routes
- `src/app/api/` — REST API endpoints: `quiz/` (save answers), `quiz/selfie/` (upload + analyze), `profile/` (generate profile), `profile/pdf/` (export PDF), `feed/` (generate items), `feed/interact/` (heart/skip/save), `outfit-check/` (upload + feedback)
- `src/components/` — React components organized by feature:
  - `quiz/` — QuizFlow, QuizSection, VisualGrid, SelfieUpload, ProgressBar
  - `profile/` — ProfileView, ColorSeasonCard, BrandList
  - `feed/` — FeedView, FeedCard, SavedItems
  - `check/` — OutfitUpload, FeedbackView
  - `pdf/` — StyleProfilePDF (react-pdf document component)
  - `Nav.tsx` — Top navigation bar
- `src/lib/` — Core utilities:
  - `claude.ts` — Anthropic SDK client singleton + `analyzeWithClaude()` helper
  - `gemini.ts` — Google Generative AI client singleton + `analyzeWithGemini()` helper
  - `drive.ts` — Google Drive upload/download, folder management, public URL generation
  - `session.ts` — `getUser()` reads NextAuth JWT, upserts local User record
  - `db.ts` — Prisma singleton with LibSQL adapter
  - `prompts.ts` — All AI prompt templates (selfie analysis, style profile, feed generation, outfit check)
  - `quiz-definitions.ts` — Quiz sections, questions, and visual-grid image queries
- `prisma/` — Schema, migrations, dev.db

### AI Integration

- **Claude**: Default model `claude-sonnet-4-6` for selfie analysis, feed generation, and outfit checks. Profile generation uses `claude-opus-4-6` for deeper analysis. Supports vision (base64 images).
- **Gemini**: `gemini-2.0-flash` as second opinion for selfie analysis and outfit checks. Also supports inline image data.
- Both models receive the same prompts (defined in `src/lib/prompts.ts`) and return structured JSON. Results are stored separately (`*Claude` / `*Gemini` fields) then merged.

### Google Drive

- Service account auth via `GOOGLE_DRIVE_CREDENTIALS` (JSON key).
- Root folder: "Whatisms Style", with subfolders: "Quiz Assets", "Feed Items", "Selfies", "Outfit Checks".
- Files are made publicly readable for direct linking.
- `driveFileId` stored on SelfieUpload, FeedItem, and OutfitCheck records.
- Helper: `getDriveImageUrl(fileId)` returns `https://drive.google.com/uc?id={fileId}`.

### Database

SQLite via LibSQL adapter. DB file at `prisma/dev.db`. 7 models:

- **User** — email, name, image; auto-created from JWT on first visit
- **QuizResponse** — answers per category (body, lifestyle, preferences, style); JSON blob; unique per user+category
- **SelfieUpload** — driveFileId, Claude + Gemini analysis results (JSON)
- **StyleProfile** — per-model profiles (Claude/Gemini), merged profile, extracted fields (colorSeason, kibbeType, styleArchetype)
- **FeedItem** — brand, item name, category, price range, AI rationale, driveFileId, batchId
- **FeedInteraction** — heart/skip/save actions; unique per user+feedItem
- **OutfitCheck** — uploaded outfit driveFileId, Claude + Gemini feedback (JSON)

### Patterns

- **Server Components** render pages; **Client Components** (`"use client"`) handle interactivity (quiz flow, feed swiping, file uploads)
- All API routes check auth via `getUser()` and return 401 if null
- All data is scoped to authenticated user via `userId` foreign keys
- DB singleton in `src/lib/db.ts` — import as `import { prisma } from "@/lib/db"`
- AI responses are parsed as JSON and stored in text columns
- Quiz uses `visual-grid` question type with `imageQuery` fields for image-backed option grids

## Docker

- **Must use `node:22-slim` (Debian), NOT `node:22-alpine`** — The `@libsql` native module requires glibc.
- **Must install OpenSSL** — Prisma requires libssl in `node:22-slim`. Add `apt-get update -y && apt-get install -y openssl` before `npm ci`.
- Port **3001** (not 3000, to avoid conflict with finance app).
- `DATABASE_URL` is set via `docker-compose.yml` to `file:/app/data/style.db` (persistent volume). `db.ts` falls back to `file:prisma/dev.db` for local dev.
- `prisma migrate deploy` runs on every container startup (idempotent).
- Standalone output mode (`output: "standalone"` in `next.config.ts`).

## Environment

Required environment variables:

- **AI**: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- **Google Drive**: `GOOGLE_DRIVE_CREDENTIALS` (service account JSON key)
- **Auth**: `NEXTAUTH_SECRET` (must match finance app's `AUTH_SECRET`)
- **Database**: `DATABASE_URL` (default `file:prisma/dev.db` for local dev)
- **Next.js basePath**: Configured to `/style` in `next.config.ts` — all routes and API endpoints are prefixed with `/style`
