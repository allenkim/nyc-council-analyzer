# Style Recommender Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered personal style recommender at `/style` on whatisms.com with a visual quiz, dual-model analysis (Claude + Gemini Pro), discovery feed, outfit check, Google Drive image storage, and PDF profile export.

**Architecture:** Next.js App Router with Prisma + SQLite for data, Claude and Gemini Pro APIs for style intelligence, Google Drive API for persistent image storage. Multi-step visual quiz builds a style profile, which drives an adaptive discovery feed. Standalone outfit check feature. All data scoped per user.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Prisma 7 + SQLite, Anthropic SDK, Google Generative AI SDK, Google Drive API, @react-pdf/renderer

---

## Reference: Existing Patterns

Before starting, study these files in `personal-finance/` — the style-recommender follows identical patterns:

- `next.config.ts` — basePath setup (`/style` instead of `/finance`)
- `src/lib/db.ts` — Prisma singleton with LibSQL adapter
- `prisma.config.ts` — Prisma config for migrations
- `prisma/schema.prisma` — schema patterns (cuid IDs, userId scoping, @@index)
- `Dockerfile` — node:22-slim, openssl, standalone build, prisma migrate deploy on startup
- `src/app/api/insights/route.ts` — API route pattern (getUser, try/catch, NextResponse.json)
- `src/app/insights/page.tsx` — Server component pattern (getUser, redirect, prisma query, Tailwind UI)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `style-recommender/package.json`
- Create: `style-recommender/next.config.ts`
- Create: `style-recommender/tsconfig.json`
- Create: `style-recommender/postcss.config.mjs`
- Create: `style-recommender/eslint.config.mjs`
- Create: `style-recommender/prisma.config.ts`
- Create: `style-recommender/src/app/layout.tsx`
- Create: `style-recommender/src/app/globals.css`
- Create: `style-recommender/src/app/page.tsx`

**Step 1: Initialize Next.js project**

```bash
cd /Users/allen/whatisms
npx create-next-app@latest style-recommender --typescript --tailwind --eslint --app --src-dir --no-import-alias --no-turbopack
```

**Step 2: Configure basePath and standalone output**

Edit `style-recommender/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/style",
  env: { NEXT_PUBLIC_BASE_PATH: "/style" },
  output: "standalone",
};

export default nextConfig;
```

**Step 3: Install dependencies**

```bash
cd /Users/allen/whatisms/style-recommender
npm install prisma @prisma/client @prisma/adapter-libsql @libsql/client @anthropic-ai/sdk @google/generative-ai googleapis @react-pdf/renderer zod date-fns
npm install -D @tailwindcss/postcss
```

**Step 4: Set up Prisma config**

Create `style-recommender/prisma.config.ts`:

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

**Step 5: Create landing page placeholder**

Create `style-recommender/src/app/page.tsx`:

```tsx
export default function StyleHome() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold">Style</h1>
      <p className="text-gray-500 mt-2">Your AI-powered personal stylist</p>
    </div>
  );
}
```

**Step 6: Verify dev server starts**

```bash
cd /Users/allen/whatisms/style-recommender
npm run dev
# Visit http://localhost:3000/style — should show landing page
```

**Step 7: Commit**

```bash
git add style-recommender/
git commit -m "feat(style): scaffold Next.js project with basePath /style"
```

---

### Task 2: Database Schema

**Files:**
- Create: `style-recommender/prisma/schema.prisma`
- Create: `style-recommender/src/lib/db.ts`
- Create: `style-recommender/src/generated/prisma/` (auto-generated)

**Step 1: Initialize Prisma**

```bash
cd /Users/allen/whatisms/style-recommender
npx prisma init --datasource-provider sqlite
```

**Step 2: Write the schema**

Replace `style-recommender/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  quizResponses    QuizResponse[]
  selfieUploads    SelfieUpload[]
  styleProfiles    StyleProfile[]
  feedItems        FeedItem[]
  feedInteractions FeedInteraction[]
  outfitChecks     OutfitCheck[]
}

model QuizResponse {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category  String   // body, lifestyle, preferences, style
  answers   String   // JSON blob
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@unique([userId, category])
}

model SelfieUpload {
  id                   String   @id @default(cuid())
  userId               String
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  driveFileId          String
  originalFilename     String?
  analysisResultClaude String?  // JSON: color season, face shape, Kibbe type
  analysisResultGemini String?  // JSON: same structure
  createdAt            DateTime @default(now())

  @@index([userId])
}

model StyleProfile {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  profileDataClaude String?  // JSON: full Claude-generated profile
  profileDataGemini String?  // JSON: full Gemini-generated profile
  mergedProfile     String?  // JSON: synthesized result
  colorSeason       String?  // e.g., "Soft Autumn"
  kibbeType         String?
  styleArchetype    String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
}

model FeedItem {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  brand        String
  itemName     String
  description  String
  category     String   // tops, bottoms, shoes, outerwear, accessories, etc.
  priceRange   String?
  sourceUrl    String?  // original external link (metadata)
  driveFileId  String?  // Google Drive image
  aiRationale  String?  // why this was suggested
  batchId      String?  // which generation batch
  createdAt    DateTime @default(now())

  interactions FeedInteraction[]

  @@index([userId])
  @@index([batchId])
}

model FeedInteraction {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  feedItemId String
  feedItem   FeedItem @relation(fields: [feedItemId], references: [id], onDelete: Cascade)
  action     String   // heart, skip, save
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([feedItemId])
  @@unique([userId, feedItemId])
}

model OutfitCheck {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  driveFileId     String   // uploaded outfit photo
  feedbackClaude  String?  // JSON: rating, feedback, suggestions
  feedbackGemini  String?  // JSON: same structure
  createdAt       DateTime @default(now())

  @@index([userId])
}
```

**Step 3: Create Prisma client and generate**

```bash
cd /Users/allen/whatisms/style-recommender
npx prisma migrate dev --name init
npx prisma generate
```

**Step 4: Create db singleton**

Create `style-recommender/src/lib/db.ts`:

```typescript
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL || "file:prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 5: Verify Prisma studio shows all tables**

```bash
cd /Users/allen/whatisms/style-recommender
npx prisma studio
# Should show: User, QuizResponse, SelfieUpload, StyleProfile, FeedItem, FeedInteraction, OutfitCheck
```

**Step 6: Commit**

```bash
git add style-recommender/prisma/ style-recommender/src/lib/db.ts style-recommender/src/generated/
git commit -m "feat(style): add Prisma schema with all data models"
```

---

### Task 3: AI Integration Libraries

**Files:**
- Create: `style-recommender/src/lib/claude.ts`
- Create: `style-recommender/src/lib/gemini.ts`
- Create: `style-recommender/src/lib/prompts.ts`

**Step 1: Create Claude client**

Create `style-recommender/src/lib/claude.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function analyzeWithClaude(
  prompt: string,
  options?: { model?: string; imageBase64?: string; mediaTtype?: string }
) {
  const claude = getClaudeClient();
  const model = options?.model || "claude-sonnet-4-6";

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

  if (options?.imageBase64) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: (options.mediaTtype || "image/jpeg") as "image/jpeg",
        data: options.imageBase64,
      },
    });
  }

  content.push({ type: "text", text: prompt });

  const response = await claude.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}
```

**Step 2: Create Gemini client**

Create `style-recommender/src/lib/gemini.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }
  return client;
}

export async function analyzeWithGemini(
  prompt: string,
  options?: { imageBase64?: string; mimeType?: string }
) {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  if (options?.imageBase64) {
    parts.push({
      inlineData: {
        data: options.imageBase64,
        mimeType: options.mimeType || "image/jpeg",
      },
    });
  }

  parts.push({ type: "text", text: prompt });

  const result = await model.generateContent(parts);
  return result.response.text();
}
```

**Step 3: Create shared prompts**

Create `style-recommender/src/lib/prompts.ts`:

```typescript
export const SELFIE_ANALYSIS_PROMPT = `You are an expert personal stylist and color analyst. Analyze this selfie and provide:

1. **12-Type Color Season**: Determine the person's color season from the 12-type system (e.g., Soft Autumn, Deep Winter, Light Spring). Explain your reasoning based on skin undertone, hair color, and eye color.

2. **Face Shape**: Identify the face shape (oval, round, square, heart, oblong, diamond, triangle). Explain what you observe.

3. **Kibbe Body Type** (if a full/partial body shot): Identify the likely Kibbe type (Dramatic, Soft Dramatic, Flamboyant Natural, Natural, Soft Natural, Dramatic Classic, Classic, Soft Classic, Flamboyant Gamine, Gamine, Soft Gamine, Romantic, Theatrical Romantic). If only a face shot, note this and provide a tentative assessment.

4. **Skin Undertone**: Warm, cool, or neutral.

Respond in valid JSON with this structure:
{
  "colorSeason": "string",
  "colorSeasonReasoning": "string",
  "faceShape": "string",
  "faceShapeReasoning": "string",
  "kibbeType": "string or null",
  "kibbeTypeReasoning": "string",
  "skinUndertone": "warm | cool | neutral",
  "undertoneReasoning": "string"
}`;

export const STYLE_PROFILE_PROMPT = `You are an expert personal stylist. Based on the following quiz answers and selfie analysis, generate a comprehensive style profile.

Quiz Answers:
{quizData}

Selfie Analysis:
{selfieAnalysis}

Generate a thorough style profile covering:
1. **Style Archetype**: A creative name for their style (e.g., "Modern Minimalist with Streetwear Edge")
2. **Color Recommendations**: Best colors based on their color season, colors to avoid
3. **Fit & Silhouette**: Recommended fits based on body type and Kibbe type
4. **Key Pieces**: 10-15 wardrobe essentials that match their style
5. **Brands to Explore**: 10-15 brands that align with their aesthetic and budget
6. **Style Do's**: 5-7 styling tips specific to them
7. **Style Don'ts**: 5-7 things to avoid
8. **Accessories**: Recommended accessories (watches, bags, jewelry, etc.)

Respond in valid JSON with this structure:
{
  "styleArchetype": "string",
  "archetypeDescription": "string",
  "colorRecommendations": { "best": ["string"], "avoid": ["string"], "neutrals": ["string"] },
  "fitRecommendations": { "tops": "string", "bottoms": "string", "outerwear": "string", "general": "string" },
  "keyPieces": [{ "item": "string", "description": "string", "priority": "essential | recommended | nice-to-have" }],
  "brandsToExplore": [{ "name": "string", "reason": "string", "priceRange": "string" }],
  "styleDos": ["string"],
  "styleDonts": ["string"],
  "accessories": [{ "type": "string", "recommendation": "string" }]
}`;

export const FEED_GENERATION_PROMPT = `You are an expert personal stylist. Based on this user's style profile and their recent feed interactions, suggest 10 specific clothing items they would love.

Style Profile:
{styleProfile}

Recent Hearts (items they loved):
{hearts}

Recent Skips (items they passed on):
{skips}

For each item, provide:
- A specific, real brand and item type (e.g., "A.P.C. Petit New Standard jeans" not just "dark jeans")
- Why it matches their style
- Category (tops, bottoms, shoes, outerwear, accessories, suiting)
- Approximate price range

Respond in valid JSON array:
[{
  "brand": "string",
  "itemName": "string",
  "description": "string",
  "category": "string",
  "priceRange": "string",
  "rationale": "string",
  "searchQuery": "string (what to Google Image search to find this item)"
}]`;

export const OUTFIT_CHECK_PROMPT = `You are an expert personal stylist reviewing someone's outfit. Analyze the outfit photo against their style profile and provide honest, constructive feedback.

Style Profile:
{styleProfile}

Evaluate:
1. **Overall Rating**: 1-10 with brief justification
2. **What's Working**: Specific elements that look great
3. **What Could Improve**: Specific, actionable suggestions
4. **Fit Assessment**: How the clothes fit their body type
5. **Color Harmony**: How the colors work together and with their color season
6. **Swap Suggestions**: 1-3 specific items that would elevate the outfit

Respond in valid JSON:
{
  "rating": number,
  "ratingJustification": "string",
  "whatsWorking": ["string"],
  "improvements": ["string"],
  "fitAssessment": "string",
  "colorHarmony": "string",
  "swapSuggestions": [{ "currentItem": "string", "suggestedSwap": "string", "reason": "string" }]
}`;
```

**Step 4: Commit**

```bash
git add style-recommender/src/lib/claude.ts style-recommender/src/lib/gemini.ts style-recommender/src/lib/prompts.ts
git commit -m "feat(style): add Claude and Gemini AI integration libraries"
```

---

### Task 4: Google Drive Integration

**Files:**
- Create: `style-recommender/src/lib/drive.ts`

**Step 1: Create Drive client**

Create `style-recommender/src/lib/drive.ts`:

```typescript
import { google } from "googleapis";

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS || "{}"),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
}

const FOLDER_IDS: Record<string, string | undefined> = {};

async function getOrCreateFolder(drive: ReturnType<typeof google.drive>, name: string, parentId?: string): Promise<string> {
  const cacheKey = `${parentId || "root"}/${name}`;
  if (FOLDER_IDS[cacheKey]) return FOLDER_IDS[cacheKey]!;

  const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ""}`;
  const res = await drive.files.list({ q: query, fields: "files(id)" });

  if (res.data.files?.length) {
    FOLDER_IDS[cacheKey] = res.data.files[0].id!;
    return res.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id",
  });

  FOLDER_IDS[cacheKey] = folder.data.id!;
  return folder.data.id!;
}

export type DriveFolder = "Quiz Assets" | "Feed Items" | "Selfies" | "Outfit Checks";

export async function uploadToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: DriveFolder
): Promise<string> {
  const drive = getDriveClient();

  const rootFolderId = await getOrCreateFolder(drive, "Whatisms Style");
  const subFolderId = await getOrCreateFolder(drive, folder, rootFolderId);

  const { Readable } = await import("stream");
  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [subFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: "id",
  });

  // Make file readable via direct link
  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: { role: "reader", type: "anyone" },
  });

  return file.data.id!;
}

export function getDriveImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?id=${fileId}`;
}

export async function downloadFromDrive(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}
```

**Step 2: Commit**

```bash
git add style-recommender/src/lib/drive.ts
git commit -m "feat(style): add Google Drive integration for persistent image storage"
```

---

### Task 5: User Session Helper

**Files:**
- Create: `style-recommender/src/lib/session.ts`

**Step 1: Create session helper**

This is a placeholder that will integrate with the site-wide Google OAuth once the auth revamp is complete. For now, it provides a stub for development.

Create `style-recommender/src/lib/session.ts`:

```typescript
import { prisma } from "./db";

// TODO: Replace with site-wide Google OAuth once auth revamp is complete.
// For now, uses a header-based approach for development.
export async function getUser() {
  // In production, this will come from the site-wide auth layer.
  // During development, we use a seeded dev user.
  const devEmail = process.env.DEV_USER_EMAIL || "dev@whatisms.com";

  let user = await prisma.user.findUnique({ where: { email: devEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: devEmail, name: "Dev User" },
    });
  }
  return user;
}
```

**Step 2: Commit**

```bash
git add style-recommender/src/lib/session.ts
git commit -m "feat(style): add session helper stub for user identity"
```

---

### Task 6: Quiz API Routes

**Files:**
- Create: `style-recommender/src/app/api/quiz/route.ts`
- Create: `style-recommender/src/app/api/quiz/selfie/route.ts`
- Create: `style-recommender/src/lib/quiz-definitions.ts`

**Step 1: Define quiz structure**

Create `style-recommender/src/lib/quiz-definitions.ts`:

```typescript
export type QuizCategory = "body" | "lifestyle" | "preferences" | "style";

export interface QuizQuestion {
  id: string;
  question: string;
  type: "select" | "multiselect" | "text" | "number" | "visual-grid";
  options?: { label: string; value: string; imageQuery?: string }[];
  placeholder?: string;
}

export interface QuizSection {
  category: QuizCategory;
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export const QUIZ_SECTIONS: QuizSection[] = [
  {
    category: "body",
    title: "Body & Fit",
    description: "Help us understand your build and fit preferences.",
    questions: [
      { id: "height", question: "What is your height?", type: "text", placeholder: "e.g., 5'10\" or 178cm" },
      { id: "weight", question: "What is your weight?", type: "text", placeholder: "e.g., 170 lbs or 77 kg" },
      { id: "bodyType", question: "How would you describe your build?", type: "select", options: [
        { label: "Slim / Lean", value: "slim" },
        { label: "Athletic / Muscular", value: "athletic" },
        { label: "Average", value: "average" },
        { label: "Stocky / Broad", value: "stocky" },
        { label: "Plus-size", value: "plus" },
      ]},
      { id: "preferredFit", question: "What fit do you prefer?", type: "visual-grid", options: [
        { label: "Slim Fit", value: "slim", imageQuery: "mens slim fit outfit" },
        { label: "Regular Fit", value: "regular", imageQuery: "mens regular fit outfit" },
        { label: "Relaxed / Oversized", value: "relaxed", imageQuery: "mens oversized relaxed fit outfit" },
      ]},
      { id: "topSize", question: "Your typical top size?", type: "select", options: [
        { label: "XS", value: "xs" }, { label: "S", value: "s" }, { label: "M", value: "m" },
        { label: "L", value: "l" }, { label: "XL", value: "xl" }, { label: "XXL", value: "xxl" },
      ]},
      { id: "bottomSize", question: "Your typical bottom size (waist)?", type: "text", placeholder: "e.g., 32" },
      { id: "shoeSize", question: "Your shoe size?", type: "text", placeholder: "e.g., 10 US" },
    ],
  },
  {
    category: "lifestyle",
    title: "Lifestyle & Context",
    description: "Tell us about your daily life and how you dress for it.",
    questions: [
      { id: "occupation", question: "What's your occupation or work environment?", type: "text", placeholder: "e.g., Software engineer, WFH" },
      { id: "dressCode", question: "What's your typical dress code?", type: "select", options: [
        { label: "Very casual (sweats, tees)", value: "very-casual" },
        { label: "Smart casual", value: "smart-casual" },
        { label: "Business casual", value: "business-casual" },
        { label: "Business formal", value: "business-formal" },
        { label: "Mixed / depends on day", value: "mixed" },
      ]},
      { id: "climate", question: "What climate do you live in?", type: "select", options: [
        { label: "Hot year-round", value: "hot" },
        { label: "Warm with mild winters", value: "warm" },
        { label: "Four distinct seasons", value: "four-seasons" },
        { label: "Cold most of the year", value: "cold" },
        { label: "Temperate / moderate", value: "temperate" },
      ]},
      { id: "occasions", question: "What occasions do you typically dress for?", type: "multiselect", options: [
        { label: "Everyday casual", value: "casual" },
        { label: "Work / office", value: "work" },
        { label: "Date nights", value: "dates" },
        { label: "Nights out / bars / clubs", value: "nightlife" },
        { label: "Formal events", value: "formal" },
        { label: "Outdoor / athletic", value: "outdoor" },
        { label: "Travel", value: "travel" },
      ]},
      { id: "activityLevel", question: "How active is your lifestyle?", type: "select", options: [
        { label: "Mostly sedentary", value: "sedentary" },
        { label: "Moderately active", value: "moderate" },
        { label: "Very active / athletic", value: "active" },
      ]},
    ],
  },
  {
    category: "preferences",
    title: "Preferences",
    description: "What colors, patterns, and materials speak to you?",
    questions: [
      { id: "favoriteColors", question: "Pick the colors you're drawn to", type: "multiselect", options: [
        { label: "Black", value: "black" }, { label: "White", value: "white" },
        { label: "Navy", value: "navy" }, { label: "Gray", value: "gray" },
        { label: "Earth tones (tan, olive, brown)", value: "earth" },
        { label: "Pastels", value: "pastels" }, { label: "Bold / bright", value: "bold" },
        { label: "Jewel tones (burgundy, emerald, sapphire)", value: "jewel" },
      ]},
      { id: "avoidColors", question: "Any colors you avoid?", type: "multiselect", options: [
        { label: "Neon / bright", value: "neon" }, { label: "Pastels", value: "pastels" },
        { label: "Orange", value: "orange" }, { label: "Pink", value: "pink" },
        { label: "Yellow", value: "yellow" }, { label: "None — I'm open", value: "none" },
      ]},
      { id: "patterns", question: "Which patterns do you like?", type: "visual-grid", options: [
        { label: "Solid / minimal", value: "solid", imageQuery: "solid color minimalist mens outfit" },
        { label: "Stripes", value: "stripes", imageQuery: "striped shirt mens outfit" },
        { label: "Plaid / check", value: "plaid", imageQuery: "plaid flannel mens outfit" },
        { label: "Floral", value: "floral", imageQuery: "floral print mens shirt" },
        { label: "Graphic / print", value: "graphic", imageQuery: "graphic tee mens outfit" },
        { label: "Geometric", value: "geometric", imageQuery: "geometric pattern mens shirt" },
      ]},
      { id: "materials", question: "Materials you love?", type: "multiselect", options: [
        { label: "Cotton", value: "cotton" }, { label: "Linen", value: "linen" },
        { label: "Denim", value: "denim" }, { label: "Wool", value: "wool" },
        { label: "Leather", value: "leather" }, { label: "Cashmere", value: "cashmere" },
        { label: "Technical / athletic", value: "technical" },
      ]},
      { id: "avoidMaterials", question: "Materials you dislike?", type: "multiselect", options: [
        { label: "Polyester", value: "polyester" }, { label: "Leather", value: "leather" },
        { label: "Wool (itchy)", value: "wool" }, { label: "Silk", value: "silk" },
        { label: "None — I'm open", value: "none" },
      ]},
      { id: "budget", question: "What's your typical budget for a single item?", type: "select", options: [
        { label: "Under $50", value: "budget" },
        { label: "$50-$150", value: "mid" },
        { label: "$150-$300", value: "premium" },
        { label: "$300+", value: "luxury" },
        { label: "Depends on the piece", value: "varies" },
      ]},
    ],
  },
  {
    category: "style",
    title: "Style Identity",
    description: "Let's discover your personal aesthetic. Pick outfits that appeal to you.",
    questions: [
      { id: "styleVibes", question: "Pick all the aesthetics that resonate with you", type: "visual-grid", options: [
        { label: "Minimalist", value: "minimalist", imageQuery: "minimalist mens fashion outfit 2025" },
        { label: "Streetwear", value: "streetwear", imageQuery: "streetwear mens fashion outfit 2025" },
        { label: "Classic / Preppy", value: "classic", imageQuery: "classic preppy mens fashion outfit" },
        { label: "Rugged / Workwear", value: "rugged", imageQuery: "rugged workwear mens outfit heritage" },
        { label: "Athleisure", value: "athleisure", imageQuery: "athleisure mens outfit 2025" },
        { label: "Smart Casual", value: "smart-casual", imageQuery: "smart casual mens outfit 2025" },
        { label: "Avant-Garde", value: "avant-garde", imageQuery: "avant garde mens fashion outfit" },
        { label: "Bohemian", value: "bohemian", imageQuery: "bohemian mens fashion outfit" },
        { label: "Scandinavian", value: "scandinavian", imageQuery: "scandinavian minimal mens outfit" },
        { label: "Japanese / Techwear", value: "techwear", imageQuery: "japanese techwear mens outfit" },
        { label: "Ivy / Trad", value: "ivy", imageQuery: "ivy league trad mens fashion" },
        { label: "Coastal / Relaxed", value: "coastal", imageQuery: "coastal relaxed mens summer outfit" },
      ]},
      { id: "styleIcons", question: "Any style icons or people whose style you admire?", type: "text", placeholder: "e.g., Ryan Gosling, Tyler the Creator, David Beckham" },
      { id: "currentBrands", question: "Brands you currently wear and love?", type: "text", placeholder: "e.g., Nike, Uniqlo, COS, Reigning Champ" },
      { id: "aspirationalBrands", question: "Brands you'd love to wear more of?", type: "text", placeholder: "e.g., Aime Leon Dore, Our Legacy, Lemaire" },
    ],
  },
];
```

**Step 2: Create quiz API route**

Create `style-recommender/src/app/api/quiz/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

// GET — fetch user's quiz responses
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const responses = await prisma.quizResponse.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(responses);
  } catch (error) {
    console.error("Error fetching quiz responses:", error);
    return NextResponse.json({ error: "Failed to fetch quiz responses" }, { status: 500 });
  }
}

// POST — save/update a quiz category's answers
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { category, answers } = await request.json();

    if (!category || !answers) {
      return NextResponse.json({ error: "category and answers required" }, { status: 400 });
    }

    const response = await prisma.quizResponse.upsert({
      where: { userId_category: { userId: user.id, category } },
      update: { answers: JSON.stringify(answers) },
      create: {
        userId: user.id,
        category,
        answers: JSON.stringify(answers),
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error saving quiz response:", error);
    return NextResponse.json({ error: "Failed to save quiz response" }, { status: 500 });
  }
}
```

**Step 3: Create selfie upload API route**

Create `style-recommender/src/app/api/quiz/selfie/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { uploadToDrive } from "@/lib/drive";
import { analyzeWithClaude } from "@/lib/claude";
import { analyzeWithGemini } from "@/lib/gemini";
import { SELFIE_ANALYSIS_PROMPT } from "@/lib/prompts";

// POST — upload selfie and run dual-model analysis
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("selfie") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Upload to Google Drive
    const driveFileId = await uploadToDrive(
      buffer,
      `selfie-${user.id}-${Date.now()}.${file.name.split(".").pop()}`,
      mimeType,
      "Selfies"
    );

    // Run Claude and Gemini analysis in parallel
    const [claudeResult, geminiResult] = await Promise.allSettled([
      analyzeWithClaude(SELFIE_ANALYSIS_PROMPT, {
        imageBase64: base64,
        mediaTtype: mimeType,
        model: "claude-sonnet-4-6",
      }),
      analyzeWithGemini(SELFIE_ANALYSIS_PROMPT, {
        imageBase64: base64,
        mimeType,
      }),
    ]);

    const claudeAnalysis = claudeResult.status === "fulfilled" ? claudeResult.value : null;
    const geminiAnalysis = geminiResult.status === "fulfilled" ? geminiResult.value : null;

    // Save to database
    const selfieUpload = await prisma.selfieUpload.create({
      data: {
        userId: user.id,
        driveFileId,
        originalFilename: file.name,
        analysisResultClaude: claudeAnalysis,
        analysisResultGemini: geminiAnalysis,
      },
    });

    return NextResponse.json(selfieUpload);
  } catch (error) {
    console.error("Error processing selfie:", error);
    return NextResponse.json({ error: "Failed to process selfie" }, { status: 500 });
  }
}

// GET — fetch user's selfie uploads
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const selfies = await prisma.selfieUpload.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(selfies);
  } catch (error) {
    console.error("Error fetching selfies:", error);
    return NextResponse.json({ error: "Failed to fetch selfies" }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add style-recommender/src/lib/quiz-definitions.ts style-recommender/src/app/api/quiz/
git commit -m "feat(style): add quiz API routes and question definitions"
```

---

### Task 7: Style Profile API Route

**Files:**
- Create: `style-recommender/src/app/api/profile/route.ts`
- Create: `style-recommender/src/app/api/profile/pdf/route.ts`

**Step 1: Create profile generation API**

Create `style-recommender/src/app/api/profile/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { analyzeWithClaude } from "@/lib/claude";
import { analyzeWithGemini } from "@/lib/gemini";
import { STYLE_PROFILE_PROMPT } from "@/lib/prompts";

// GET — fetch user's style profile
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// POST — generate style profile from quiz + selfie data
export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Gather all quiz responses
    const quizResponses = await prisma.quizResponse.findMany({
      where: { userId: user.id },
    });

    if (quizResponses.length === 0) {
      return NextResponse.json({ error: "Complete the quiz first" }, { status: 400 });
    }

    const quizData = Object.fromEntries(
      quizResponses.map((r) => [r.category, JSON.parse(r.answers)])
    );

    // Get latest selfie analysis
    const selfie = await prisma.selfieUpload.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const selfieAnalysis = selfie
      ? { claude: selfie.analysisResultClaude, gemini: selfie.analysisResultGemini }
      : null;

    // Build the prompt
    const prompt = STYLE_PROFILE_PROMPT
      .replace("{quizData}", JSON.stringify(quizData, null, 2))
      .replace("{selfieAnalysis}", JSON.stringify(selfieAnalysis, null, 2));

    // Run Claude (Opus) and Gemini in parallel
    const [claudeResult, geminiResult] = await Promise.allSettled([
      analyzeWithClaude(prompt, { model: "claude-opus-4-6" }),
      analyzeWithGemini(prompt),
    ]);

    const claudeProfile = claudeResult.status === "fulfilled" ? claudeResult.value : null;
    const geminiProfile = geminiResult.status === "fulfilled" ? geminiResult.value : null;

    // Parse JSON from responses (handle markdown code blocks)
    function parseJsonResponse(text: string | null): Record<string, unknown> | null {
      if (!text) return null;
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      try {
        return JSON.parse(jsonStr.trim());
      } catch {
        return null;
      }
    }

    const claudeParsed = parseJsonResponse(claudeProfile);
    const geminiParsed = parseJsonResponse(geminiProfile);

    // Extract key fields from whichever model succeeded
    const primary = claudeParsed || geminiParsed;
    const colorSeason = (primary as Record<string, unknown>)?.colorRecommendations
      ? ((selfieAnalysis?.claude ? JSON.parse(selfieAnalysis.claude) : null)?.colorSeason || null)
      : null;

    const profile = await prisma.styleProfile.upsert({
      where: { id: (await prisma.styleProfile.findFirst({ where: { userId: user.id } }))?.id || "" },
      update: {
        profileDataClaude: claudeProfile,
        profileDataGemini: geminiProfile,
        mergedProfile: JSON.stringify({ claude: claudeParsed, gemini: geminiParsed }),
        colorSeason: colorSeason,
        kibbeType: selfieAnalysis?.claude ? (parseJsonResponse(selfieAnalysis.claude) as Record<string, unknown>)?.kibbeType as string : null,
        styleArchetype: (claudeParsed as Record<string, unknown>)?.styleArchetype as string || (geminiParsed as Record<string, unknown>)?.styleArchetype as string || null,
      },
      create: {
        userId: user.id,
        profileDataClaude: claudeProfile,
        profileDataGemini: geminiProfile,
        mergedProfile: JSON.stringify({ claude: claudeParsed, gemini: geminiParsed }),
        colorSeason: colorSeason,
        kibbeType: selfieAnalysis?.claude ? (parseJsonResponse(selfieAnalysis.claude) as Record<string, unknown>)?.kibbeType as string : null,
        styleArchetype: (claudeParsed as Record<string, unknown>)?.styleArchetype as string || (geminiParsed as Record<string, unknown>)?.styleArchetype as string || null,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error generating profile:", error);
    return NextResponse.json({ error: "Failed to generate profile" }, { status: 500 });
  }
}
```

**Step 2: Create PDF export route**

Create `style-recommender/src/app/api/profile/pdf/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import ReactPDF from "@react-pdf/renderer";
import { StyleProfilePDF } from "@/components/pdf/StyleProfilePDF";

// GET — download style profile as PDF
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    if (!profile?.mergedProfile) {
      return NextResponse.json({ error: "No profile found. Complete the quiz first." }, { status: 404 });
    }

    const profileData = JSON.parse(profile.mergedProfile);
    const selfie = await prisma.selfieUpload.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const pdfStream = await ReactPDF.renderToStream(
      StyleProfilePDF({
        userName: user.name || user.email,
        profileData,
        colorSeason: profile.colorSeason,
        kibbeType: profile.kibbeType,
        styleArchetype: profile.styleArchetype,
      })
    );

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="style-profile-${user.name || "user"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
```

**Step 3: Create PDF component (placeholder — flesh out during frontend task)**

Create `style-recommender/src/components/pdf/StyleProfilePDF.tsx`:

```tsx
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  title: { fontSize: 28, marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8, color: "#333" },
  text: { fontSize: 11, lineHeight: 1.5, color: "#444" },
  listItem: { fontSize: 11, lineHeight: 1.6, marginLeft: 12, color: "#444" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#eee", marginVertical: 16 },
});

interface StyleProfilePDFProps {
  userName: string;
  profileData: { claude?: Record<string, unknown>; gemini?: Record<string, unknown> };
  colorSeason: string | null;
  kibbeType: string | null;
  styleArchetype: string | null;
}

export function StyleProfilePDF({ userName, profileData, colorSeason, kibbeType, styleArchetype }: StyleProfilePDFProps) {
  const profile = profileData.claude || profileData.gemini || {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Style Profile</Text>
        <Text style={styles.subtitle}>{userName}</Text>

        {styleArchetype && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Style Archetype</Text>
            <Text style={styles.text}>{styleArchetype}</Text>
            {(profile as Record<string, unknown>).archetypeDescription && (
              <Text style={styles.text}>{String((profile as Record<string, unknown>).archetypeDescription)}</Text>
            )}
          </View>
        )}

        <View style={styles.divider} />

        {colorSeason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Color Season</Text>
            <Text style={styles.text}>{colorSeason}</Text>
          </View>
        )}

        {kibbeType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kibbe Body Type</Text>
            <Text style={styles.text}>{kibbeType}</Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Full Analysis</Text>
          <Text style={styles.text}>{JSON.stringify(profile, null, 2)}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

**Step 4: Commit**

```bash
git add style-recommender/src/app/api/profile/ style-recommender/src/components/pdf/
git commit -m "feat(style): add profile generation API with PDF export"
```

---

### Task 8: Discovery Feed API Route

**Files:**
- Create: `style-recommender/src/app/api/feed/route.ts`
- Create: `style-recommender/src/app/api/feed/interact/route.ts`

**Step 1: Create feed generation API**

Create `style-recommender/src/app/api/feed/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { analyzeWithClaude } from "@/lib/claude";
import { FEED_GENERATION_PROMPT } from "@/lib/prompts";

// GET — fetch user's feed items (unseen first, then saved)
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Items user hasn't interacted with yet
    const unseenItems = await prisma.feedItem.findMany({
      where: {
        userId: user.id,
        interactions: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Saved items
    const savedItems = await prisma.feedItem.findMany({
      where: {
        userId: user.id,
        interactions: { some: { action: "save" } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Hearted items
    const heartedItems = await prisma.feedItem.findMany({
      where: {
        userId: user.id,
        interactions: { some: { action: "heart" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ unseen: unseenItems, saved: savedItems, hearted: heartedItems });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}

// POST — generate a new batch of feed items
export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    if (!profile?.mergedProfile) {
      return NextResponse.json({ error: "Complete your style profile first" }, { status: 400 });
    }

    // Get recent interactions for context
    const recentHearts = await prisma.feedItem.findMany({
      where: { userId: user.id, interactions: { some: { action: "heart" } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentSkips = await prisma.feedItem.findMany({
      where: { userId: user.id, interactions: { some: { action: "skip" } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const prompt = FEED_GENERATION_PROMPT
      .replace("{styleProfile}", profile.mergedProfile)
      .replace("{hearts}", JSON.stringify(recentHearts.map((i) => `${i.brand} ${i.itemName}`)))
      .replace("{skips}", JSON.stringify(recentSkips.map((i) => `${i.brand} ${i.itemName}`)));

    const response = await analyzeWithClaude(prompt, { model: "claude-sonnet-4-6" });

    // Parse items from response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    let items: Array<Record<string, string>>;
    try {
      items = JSON.parse(jsonStr.trim());
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const batchId = `batch-${Date.now()}`;

    // Create feed items (images will be fetched separately)
    const created = await prisma.feedItem.createMany({
      data: items.map((item) => ({
        userId: user.id,
        brand: item.brand,
        itemName: item.itemName,
        description: item.description,
        category: item.category,
        priceRange: item.priceRange,
        aiRationale: item.rationale,
        batchId,
      })),
    });

    return NextResponse.json({ generated: created.count, batchId });
  } catch (error) {
    console.error("Error generating feed:", error);
    return NextResponse.json({ error: "Failed to generate feed" }, { status: 500 });
  }
}
```

**Step 2: Create feed interaction API**

Create `style-recommender/src/app/api/feed/interact/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

// POST — record a feed interaction (heart, skip, save)
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { feedItemId, action } = await request.json();

    if (!feedItemId || !["heart", "skip", "save"].includes(action)) {
      return NextResponse.json({ error: "feedItemId and valid action required" }, { status: 400 });
    }

    // Verify the feed item belongs to this user
    const feedItem = await prisma.feedItem.findFirst({
      where: { id: feedItemId, userId: user.id },
    });

    if (!feedItem) {
      return NextResponse.json({ error: "Feed item not found" }, { status: 404 });
    }

    const interaction = await prisma.feedInteraction.upsert({
      where: { userId_feedItemId: { userId: user.id, feedItemId } },
      update: { action },
      create: { userId: user.id, feedItemId, action },
    });

    return NextResponse.json(interaction);
  } catch (error) {
    console.error("Error recording interaction:", error);
    return NextResponse.json({ error: "Failed to record interaction" }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add style-recommender/src/app/api/feed/
git commit -m "feat(style): add discovery feed API with interaction tracking"
```

---

### Task 9: Outfit Check API Route

**Files:**
- Create: `style-recommender/src/app/api/outfit-check/route.ts`

**Step 1: Create outfit check API**

Create `style-recommender/src/app/api/outfit-check/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { uploadToDrive } from "@/lib/drive";
import { analyzeWithClaude } from "@/lib/claude";
import { analyzeWithGemini } from "@/lib/gemini";
import { OUTFIT_CHECK_PROMPT } from "@/lib/prompts";

// POST — upload outfit photo and get dual-model feedback
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("outfit") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get user's style profile for context
    const profile = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Upload to Drive
    const driveFileId = await uploadToDrive(
      buffer,
      `outfit-${user.id}-${Date.now()}.${file.name.split(".").pop()}`,
      mimeType,
      "Outfit Checks"
    );

    // Build prompt with profile context
    const prompt = OUTFIT_CHECK_PROMPT.replace(
      "{styleProfile}",
      profile?.mergedProfile || "No style profile available yet."
    );

    // Run both models in parallel
    const [claudeResult, geminiResult] = await Promise.allSettled([
      analyzeWithClaude(prompt, { imageBase64: base64, mediaTtype: mimeType }),
      analyzeWithGemini(prompt, { imageBase64: base64, mimeType }),
    ]);

    const outfitCheck = await prisma.outfitCheck.create({
      data: {
        userId: user.id,
        driveFileId,
        feedbackClaude: claudeResult.status === "fulfilled" ? claudeResult.value : null,
        feedbackGemini: geminiResult.status === "fulfilled" ? geminiResult.value : null,
      },
    });

    return NextResponse.json(outfitCheck);
  } catch (error) {
    console.error("Error checking outfit:", error);
    return NextResponse.json({ error: "Failed to check outfit" }, { status: 500 });
  }
}

// GET — fetch outfit check history
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const checks = await prisma.outfitCheck.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(checks);
  } catch (error) {
    console.error("Error fetching outfit checks:", error);
    return NextResponse.json({ error: "Failed to fetch outfit checks" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add style-recommender/src/app/api/outfit-check/
git commit -m "feat(style): add outfit check API with dual-model analysis"
```

---

### Task 10: Quiz Frontend — Multi-Step Visual Form

**Files:**
- Create: `style-recommender/src/app/quiz/page.tsx`
- Create: `style-recommender/src/components/quiz/QuizFlow.tsx`
- Create: `style-recommender/src/components/quiz/QuizSection.tsx`
- Create: `style-recommender/src/components/quiz/VisualGrid.tsx`
- Create: `style-recommender/src/components/quiz/SelfieUpload.tsx`
- Create: `style-recommender/src/components/quiz/ProgressBar.tsx`

**Guidance:** This is the most complex frontend task. Build it incrementally:

1. Start with the `ProgressBar` component — a simple bar showing current step out of total steps (5 sections: body, lifestyle, preferences, style, selfie).

2. Build `QuizSection` — renders a single quiz section's questions. For `select`, render radio buttons. For `multiselect`, render checkboxes. For `text`/`number`, render inputs. For `visual-grid`, delegate to `VisualGrid`.

3. Build `VisualGrid` — renders a grid of image cards. Each card has an image (loaded from the `imageQuery` via a placeholder initially, then real images from Drive once quiz assets are seeded) and a label. Cards are selectable (toggle on click, highlighted when selected).

4. Build `SelfieUpload` — file input that shows a preview, uploads via the `/api/quiz/selfie` endpoint, and displays analysis results (loading state while AI processes).

5. Build `QuizFlow` — the orchestrator. Manages state across all sections, shows one section at a time, handles navigation (Next/Back), saves each section to the API on advance, and shows the selfie upload as the final step.

6. Build `page.tsx` — server component that checks if user has existing quiz data, passes it to `QuizFlow` as initial state.

**Key UI decisions:**
- Use Tailwind for all styling
- Visual grid cards should be large enough to see detail (~200x250px)
- Progress bar shows which section you're on
- "Next" button saves current section and advances
- "Back" button navigates without saving
- Final step has "Generate Profile" button that calls `/api/profile` POST
- All state managed client-side with `useState`; API calls on section transitions

**Step 1-6:** Implement each component as described above.

**Step 7: Verify the quiz flow end-to-end**

```bash
cd /Users/allen/whatisms/style-recommender
npm run dev
# Navigate to /style/quiz
# Walk through all 5 sections
# Verify data saves to SQLite via Prisma Studio
```

**Step 8: Commit**

```bash
git add style-recommender/src/app/quiz/ style-recommender/src/components/quiz/
git commit -m "feat(style): add multi-step visual quiz frontend"
```

---

### Task 11: Profile Frontend

**Files:**
- Create: `style-recommender/src/app/profile/page.tsx`
- Create: `style-recommender/src/components/profile/ProfileView.tsx`
- Create: `style-recommender/src/components/profile/ColorSeasonCard.tsx`
- Create: `style-recommender/src/components/profile/BrandList.tsx`

**Guidance:**

1. `page.tsx` — Server component. Fetches the user's StyleProfile via Prisma. If no profile, redirect to `/style/quiz`. Parse the `mergedProfile` JSON and pass to ProfileView.

2. `ProfileView` — Main layout. Sections for:
   - Style archetype header (big, prominent)
   - Color season card with visual swatches
   - Kibbe type and fit recommendations
   - Brands to explore (grid of brand names with brief descriptions)
   - Key pieces / wardrobe essentials list
   - Style do's and don'ts (two-column layout)
   - Where Claude and Gemini agree/diverge (if both provided data)
   - "Download PDF" button → hits `/api/profile/pdf` endpoint
   - "Retake Quiz" button → navigates to `/style/quiz`

3. Use the `@frontend-design` skill guidance for making this page visually polished — this is the key output page users will screenshot and share.

**Step 1-3:** Implement the components.

**Step 4: Verify profile renders with real data**

Complete the quiz → generate profile → verify the profile page shows all sections.

**Step 5: Commit**

```bash
git add style-recommender/src/app/profile/ style-recommender/src/components/profile/
git commit -m "feat(style): add style profile page with PDF download"
```

---

### Task 12: Discovery Feed Frontend

**Files:**
- Create: `style-recommender/src/app/discover/page.tsx`
- Create: `style-recommender/src/components/feed/FeedCard.tsx`
- Create: `style-recommender/src/components/feed/FeedView.tsx`
- Create: `style-recommender/src/components/feed/SavedItems.tsx`

**Guidance:**

1. `page.tsx` — Server component. Checks for style profile (redirect to quiz if missing). Fetches initial feed items.

2. `FeedView` — Client component. Shows cards one at a time (or in a small grid). Three action buttons per card: Heart (green), Skip (gray), Save (yellow/bookmark). When user runs out of unseen items, shows a "Get More Recommendations" button that calls POST `/api/feed`.

3. `FeedCard` — Individual card component. Shows: product image (from Drive URL or placeholder), brand name, item name, description, price range, AI rationale (expandable). Styled as a clean card with rounded corners and shadow.

4. Tab navigation at top: "New for You" | "Saved" | "Hearted"
   - "New for You" shows unseen items
   - "Saved" shows items with save interaction
   - "Hearted" shows items with heart interaction

5. First visit with no feed items: show a "Generate Your First Recommendations" button that calls POST `/api/feed`.

**Step 1-4:** Implement the components.

**Step 5: Verify feed flow end-to-end**

Generate recommendations → see cards → heart/skip/save → check tabs → generate more.

**Step 6: Commit**

```bash
git add style-recommender/src/app/discover/ style-recommender/src/components/feed/
git commit -m "feat(style): add discovery feed with interactive cards"
```

---

### Task 13: Outfit Check Frontend

**Files:**
- Create: `style-recommender/src/app/check/page.tsx`
- Create: `style-recommender/src/components/check/OutfitUpload.tsx`
- Create: `style-recommender/src/components/check/FeedbackView.tsx`

**Guidance:**

1. `page.tsx` — Server component. Fetches outfit check history.

2. `OutfitUpload` — Client component. Drag-and-drop or click-to-upload zone. Shows preview after selection. "Get Feedback" button submits to `/api/outfit-check`. Loading state while AI processes (this takes ~10-15 seconds for dual-model).

3. `FeedbackView` — Renders both Claude and Gemini feedback side by side. Shows: rating (big number), what's working (green), improvements (amber), swap suggestions (cards). Label which model gave which feedback.

4. Below the upload area, show a history of past outfit checks with thumbnails and ratings.

**Step 1-3:** Implement the components.

**Step 4: Verify outfit check flow**

Upload an outfit photo → wait for analysis → see dual feedback.

**Step 5: Commit**

```bash
git add style-recommender/src/app/check/ style-recommender/src/components/check/
git commit -m "feat(style): add outfit check with dual-model feedback"
```

---

### Task 14: Navigation & Layout

**Files:**
- Modify: `style-recommender/src/app/layout.tsx`
- Create: `style-recommender/src/components/Nav.tsx`

**Guidance:**

1. `Nav` — Client component. Horizontal nav bar with links: Style Home, Quiz, Profile, Discover, Check. Highlight active link. Clean, minimal design.

2. Update `layout.tsx` to include the Nav component, global styles, and a consistent page wrapper.

3. Update the landing page (`page.tsx`) to show:
   - If user has no quiz data: "Get Started" CTA → `/style/quiz`
   - If user has profile: summary card + links to discover/check
   - Overview of features

**Step 1-3:** Implement.

**Step 4: Commit**

```bash
git add style-recommender/src/app/layout.tsx style-recommender/src/components/Nav.tsx style-recommender/src/app/page.tsx
git commit -m "feat(style): add navigation and landing page"
```

---

### Task 15: Docker & Infrastructure

**Files:**
- Create: `style-recommender/Dockerfile`
- Create: `style-recommender/.dockerignore`
- Modify: `docker-compose.yml`
- Modify: `Caddyfile`

**Step 1: Create Dockerfile**

Create `style-recommender/Dockerfile` (mirror personal-finance pattern):

```dockerfile
# Builder stage
FROM node:22-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Runtime stage
FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/data

RUN useradd --create-home --shell /bin/false appuser \
    && chown -R appuser:appuser /app

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "const http=require('http');http.get('http://localhost:3001/style',(r)=>r.statusCode===200?process.exit(0):process.exit(1)).on('error',()=>process.exit(1))"

USER appuser

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && PORT=3001 node server.js"]
```

**Step 2: Create .dockerignore**

Create `style-recommender/.dockerignore`:

```
node_modules
.next
prisma/dev.db
prisma/dev.db-journal
.env
.env.local
```

**Step 3: Add service to docker-compose.yml**

Add to `docker-compose.yml` services section:

```yaml
  style:
    build: ./style-recommender
    expose:
      - "3001"
    volumes:
      - style-data:/app/data
    environment:
      - HOSTNAME=0.0.0.0
      - PORT=3001
      - DATABASE_URL=file:/app/data/style.db
    env_file:
      - path: style-recommender/.env
        required: false
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "const http=require('http');http.get('http://localhost:3001/style',(r)=>r.statusCode===200?process.exit(0):process.exit(1)).on('error',()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      start_period: 60s
      retries: 3
```

Add to volumes section:

```yaml
  style-data:
    name: whatisms_style-data
```

Update caddy depends_on to include style:

```yaml
  caddy:
    depends_on:
      district2:
        condition: service_started
      finance:
        condition: service_healthy
      style:
        condition: service_healthy
```

**Step 4: Update Caddyfile**

Add before the default handle block:

```
handle /style* {
    reverse_proxy style:3001
}
```

Update CSP to add Google Drive image domain:

```
img-src 'self' data: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://drive.google.com https://lh3.googleusercontent.com;
connect-src 'self' https://*.plaid.com https://api.anthropic.com https://generativelanguage.googleapis.com https://www.googleapis.com;
```

**Step 5: Create env.example**

Create `style-recommender/env.example`:

```
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
GOOGLE_DRIVE_CREDENTIALS={"type":"service_account","project_id":"..."}
DATABASE_URL=file:prisma/dev.db
DEV_USER_EMAIL=dev@whatisms.com
```

**Step 6: Verify Docker build**

```bash
cd /Users/allen/whatisms
docker compose build style
```

**Step 7: Commit**

```bash
git add style-recommender/Dockerfile style-recommender/.dockerignore style-recommender/env.example docker-compose.yml Caddyfile
git commit -m "feat(style): add Docker and infrastructure config"
```

---

### Task 16: Quiz Asset Seeding

**Files:**
- Create: `style-recommender/scripts/seed-quiz-assets.ts`

**Guidance:**

The visual quiz needs images for style archetypes, fits, and patterns. This script:

1. Uses Claude to generate descriptions and search queries for each visual-grid option in the quiz
2. Uses a free image search (Google Custom Search free tier or SerpAPI free tier) to find representative images
3. Downloads images and uploads to Google Drive (`Quiz Assets/` folder)
4. Outputs a JSON mapping of `questionId:optionValue → driveFileId` that the quiz frontend uses

This is a **one-time script** run during setup, not on every request.

```bash
cd /Users/allen/whatisms/style-recommender
npx tsx scripts/seed-quiz-assets.ts
```

**Step 1:** Write the script that processes each visual-grid question option.

**Step 2:** Run it and verify images appear in Google Drive.

**Step 3:** Store the mapping in a JSON file or in the database for the quiz frontend to reference.

**Step 4: Commit**

```bash
git add style-recommender/scripts/
git commit -m "feat(style): add quiz asset seeding script"
```

---

### Task 17: CLAUDE.md for Style Recommender

**Files:**
- Create: `style-recommender/CLAUDE.md`

**Step 1: Write project-specific CLAUDE.md**

Create `style-recommender/CLAUDE.md` following the pattern of `personal-finance/CLAUDE.md`. Include:
- Overview of the project
- Commands (dev, build, lint, prisma)
- Architecture (stack, data flow, key directories)
- AI integration details (Claude, Gemini, prompts)
- Google Drive integration
- Docker notes (same node:22-slim requirement)
- Environment variables
- Key patterns (getUser, Prisma queries, API route structure)

**Step 2: Update root CLAUDE.md**

Add style-recommender to the projects table in `/Users/allen/whatisms/CLAUDE.md`.

**Step 3: Commit**

```bash
git add style-recommender/CLAUDE.md CLAUDE.md
git commit -m "docs: add CLAUDE.md for style-recommender project"
```

---

## Execution Order

Tasks 1-5 are foundational and must be done first, in order.
Tasks 6-9 (API routes) can be done in parallel.
Tasks 10-13 (frontend) depend on their respective API routes.
Task 14 (nav/layout) should come after at least one frontend page exists.
Task 15 (Docker) can be done anytime after Task 1.
Task 16 (seeding) should come after Tasks 4 and 6.
Task 17 (docs) should come last.

```
Task 1 (scaffold)
  → Task 2 (schema)
    → Task 3 (AI libs)
    → Task 4 (Drive lib)
    → Task 5 (session)
      → Task 6 (quiz API)     → Task 10 (quiz frontend)
      → Task 7 (profile API)  → Task 11 (profile frontend)
      → Task 8 (feed API)     → Task 12 (feed frontend)
      → Task 9 (outfit API)   → Task 13 (outfit frontend)
                               → Task 14 (nav/layout)
      → Task 15 (Docker) — can start after Task 1
      → Task 16 (seeding) — after Tasks 4, 6
      → Task 17 (docs) — last
```
