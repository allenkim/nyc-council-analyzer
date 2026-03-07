# Style Recommender Design

**Date:** 2026-03-07
**Project:** AI-powered personal style recommender for whatisms.com
**Path:** `/style/*`
**Stack:** Next.js + Prisma + SQLite + Claude API + Gemini Pro API + Google Drive API

## Overview

A personal AI stylist that lives on whatisms.com. It learns a user's body, preferences, and taste through a thorough visual quiz and selfie analysis, generates a comprehensive style profile, then provides an adaptive discovery feed of clothing recommendations. Users can also upload outfit photos for AI-powered feedback.

Multi-user: each authorized user gets their own isolated style profile and recommendations. Auth is handled by the site-wide Google OAuth revamp (not built into this project).

## User Flow

### 1. Style Quiz (`/style/quiz`)

Multi-step form, ~25 questions across categories:

- **Body & Fit**: height, weight, body type, preferred fit (slim/regular/relaxed), sizes (top, bottom, shoe)
- **Lifestyle & Context**: occupation/dress code, climate, typical occasions (casual, work, nights out, events), activity level
- **Preferences**: favorite colors, colors you avoid, patterns (solid/stripe/plaid/floral), materials you love/hate, budget range
- **Style Identity**: visual grids of outfit images to heart/skip, style icons, brands you already wear
- **Selfie Upload**: photo(s) for AI analysis of skin tone, 12-type color season, face shape, Kibbe body type

Key design principle: **visual where possible**. Style identity, fit preferences, patterns, and colors are presented as image grids rather than text labels. Text-based for things that don't benefit from visuals (height, weight, occupation, budget).

Progress bar across the top. One category per page. The visual heart/skip questions during the quiz seed the initial taste profile.

### 2. Style Profile (`/style/profile`)

Claude (primary) and Gemini Pro (second opinion) synthesize all quiz answers + selfie analysis into a comprehensive style profile:

- 12-type color season analysis (e.g., "Soft Autumn")
- Kibbe body type and fit recommendations
- Face shape analysis
- Style archetype (e.g., "Modern Minimalist with Streetwear Edge")
- Recommended brands to explore
- Wardrobe essentials / key pieces
- Style do's and don'ts
- Areas of agreement/divergence between models

**PDF export**: downloadable, polished PDF of the full profile.

Users can retake the quiz anytime to update their profile.

### 3. Discovery Feed (`/style/discover`)

Unified feed combining discovery and recommendations:

- Card-based UI showing clothing items
- Each card: product image, brand, item name, price range, brief description
- Actions: **Heart** (love it), **Skip** (not for me), **Save for later**
- Claude curates batches based on style profile + interaction history, adapting over time
- Sections/filters: "New for you," "Brands to explore," "Outfit ideas," "Saved items"
- Items sourced via free image/product search based on Claude's recommendations
- Refreshes on demand or when user runs out of items

### 4. Outfit Check (`/style/check`)

Standalone utility, usable anytime:

- Upload a photo of what you're wearing
- Both Claude and Gemini evaluate against your style profile
- Feedback: what's working, what clashes, fit assessment, specific swap suggestions, overall rating
- Two perspectives shown side by side
- History of past checks viewable

## Data Model

### QuizResponse
- `id`, `userId`, `category` (body/lifestyle/preferences/style/selfie)
- `answers` (JSON blob)
- `createdAt`, `updatedAt`

### SelfieUpload
- `id`, `userId`
- `driveFileId` (Google Drive primary storage)
- `originalUrl` (if applicable)
- `analysisResultClaude` (JSON — color season, face shape, Kibbe type)
- `analysisResultGemini` (JSON — same structure)
- `createdAt`

### StyleProfile
- `id`, `userId`
- `profileDataClaude` (JSON — full Claude-generated profile)
- `profileDataGemini` (JSON — full Gemini-generated profile)
- `mergedProfile` (JSON — synthesized result shown to user)
- `colorSeason` (string — e.g., "Soft Autumn")
- `kibbeType` (string)
- `styleArchetype` (string)
- `createdAt`, `updatedAt`

### FeedItem
- `id`, `userId`
- `brand`, `itemName`, `description`, `category`
- `priceRange` (string)
- `sourceUrl` (original external link, metadata only)
- `driveFileId` (Google Drive primary image storage)
- `aiRationale` (why Claude suggested this)
- `batchId` (which generation batch)
- `createdAt`

### FeedInteraction
- `id`, `userId`, `feedItemId`
- `action` (heart / skip / save)
- `createdAt`

### OutfitCheck
- `id`, `userId`
- `driveFileId` (uploaded outfit photo)
- `feedbackClaude` (JSON — rating, feedback text, suggestions)
- `feedbackGemini` (JSON — same structure)
- `createdAt`

All tables scoped by `userId` for multi-user data isolation.

## Claude Integration

### Selfie Analysis
- Image sent to both Claude and Gemini Pro in parallel
- Prompt requests: 12-type color season, face shape, Kibbe body type, skin undertone
- Returns structured JSON
- Combined result shows agreement/divergence

### Quiz Visual Curation
- Pre-generated: Claude generates a diverse set of style archetype descriptions, we source matching images, store in Drive, reuse across users
- One-time seeding step, not per-user API call

### Style Profile Generation
- All quiz answers + selfie analysis sent to Claude (Opus for quality) and Gemini Pro
- Returns comprehensive structured profile
- Results merged with attribution ("both models agree" vs "different perspectives")

### Discovery Feed — Item Generation
- Claude receives: user's style profile + last N feed interactions (hearts/skips)
- Returns: list of specific items (brand, item name, category, description, rationale)
- Images sourced via free search, saved to Drive, FeedItem records created
- Called on refresh or when user exhausts current batch

### Outfit Check
- Outfit photo + style profile sent to both Claude and Gemini
- Each returns: rating, what's working, what to improve, specific suggestions
- Both perspectives displayed side by side

### Model Selection
- **Claude Opus**: style profile generation (comprehensive synthesis)
- **Claude Sonnet**: feed item generation, quiz visual curation (fast, cost-effective)
- **Gemini Pro**: parallel analysis for selfies, profiles, outfit checks (second opinion)

## Image Storage — Google Drive

All images stored persistently in Google Drive. External URLs kept as metadata/provenance only.

### Folder Structure
```
Whatisms Style/
  Quiz Assets/        <- visual quiz images (shared across users)
  Feed Items/         <- discovery feed clothing images
  Selfies/            <- user-uploaded selfies
  Outfit Checks/      <- user-uploaded outfit photos
```

### Flow
1. Image enters the system (sourced externally or uploaded by user)
2. Uploaded to Google Drive via Drive API
3. `driveFileId` stored on the database record
4. App serves images from Drive

Google Drive API is free for personal use (accessing your own Drive). Reuses the existing Google OAuth token.

## Infrastructure

### Project Structure
```
style-recommender/        <- new directory in monorepo root
  Dockerfile
  CLAUDE.md
  src/
    app/                  <- Next.js app router pages
      quiz/
      profile/
      discover/
      check/
    lib/                  <- API clients, utilities
    components/           <- shared UI components
  prisma/
    schema.prisma
```

### Docker Compose
- New `style` service, port 3001
- New `style-data` volume for SQLite persistence
- Depends on site-wide auth (not self-contained)

### Caddy
- New `handle /style*` block routing to `style:3001`
- CSP updates: Google Drive image domains, Claude/Gemini API domains in `connect-src`

### Environment Variables
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_DRIVE_CREDENTIALS` (or reuse OAuth token)

### Key Pages
```
/style              -> landing/dashboard
/style/quiz         -> multi-step visual quiz
/style/profile      -> style profile + PDF export
/style/discover     -> discovery feed (heart/skip/save)
/style/check        -> outfit check upload + feedback
```

### PDF Generation
Server-side via `@react-pdf/renderer` or similar library.

## Auth

Not built into this project. Assumes site-wide Google OAuth revamp provides authenticated user identity (email/ID). All data queries scoped by this identity.

## Deferred Features

- **Sale tracking**: monitor prices/sales for hearted items
- **Wardrobe digitization**: photograph owned clothes, get outfit combos
- **Conversational chat**: ask your stylist questions in freeform chat
- **Hair/makeup recommendations**: extend beyond clothing
- **Virtual try-on**: AI-generated visualization of clothes on your body
