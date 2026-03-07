# Finance Tracker Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate the finance tracker from 10 sidebar tabs to 4 (Dashboard, Accounts, Money Flow, Advisor), add inline holding editing, auto crypto prices, daily snapshots, and an AI-powered Boglehead financial advisor.

**Architecture:** New Prisma models (UserProfile, AdvisorRecommendation) added to existing schema. New API routes for profile, advisor, and crypto prices. Dashboard absorbs History + Breakdown pages. Money Flow absorbs Spending + Budgets + Bills + Transactions pages. Advisor replaces Insights page with expanded AI recommendations. Old pages removed after new ones verified.

**Tech Stack:** Next.js 16, React 19, Prisma 7, LibSQL/SQLite, Tailwind v4, Recharts 3, Anthropic SDK (Claude), CoinGecko API, date-fns

---

## Task 1: Database Schema Changes

Add UserProfile and AdvisorRecommendation models. Add relations to User model.

**Files:**
- Modify: `personal-finance/prisma/schema.prisma`

**Step 1: Add new models to schema**

Add these models to the end of `prisma/schema.prisma` (before the closing of the file, after the Insight model):

```prisma
// User financial profile for advisor recommendations
model UserProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Required
  age             Int
  annualIncome    Float
  riskTolerance   String   // CONSERVATIVE, MODERATE, AGGRESSIVE

  // Optional
  filingStatus    String?  // SINGLE, MARRIED_FILING_JOINTLY, MARRIED_FILING_SEPARATELY, HEAD_OF_HOUSEHOLD
  employmentType  String?  // W2, SELF_EMPLOYED_1099, RETIRED, STUDENT, OTHER
  stateOfResidence String?
  employer401kMatch String? // JSON: { "matchPercent": 100, "upToPercent": 6 }
  dependents      Int?
  isHomeowner     Boolean?
  monthlyTakeHome Float?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// AI-powered advisor recommendations
model AdvisorRecommendation {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        String    // ACCOUNT_STRUCTURE, ALLOCATION, COST_OPTIMIZATION, SPENDING, WHAT_TO_BUY
  category    String    // For UI grouping
  title       String
  summary     String
  details     String?   // Longer explanation for "Learn more"
  priority    Int       // 1-10, higher = more impactful
  isDismissed Boolean   @default(false)
  dismissedAt DateTime?
  data        String?   // JSON for structured data

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId, isDismissed])
}
```

**Step 2: Add relations to User model**

In the User model (line 10-28), add these two relation fields after the existing `snapshots` field:

```prisma
  profile              UserProfile?
  advisorRecommendations AdvisorRecommendation[]
```

**Step 3: Run migration**

```bash
cd /Users/allen/whatisms/personal-finance
npx prisma db push
```

Expected: Schema synced, tables created. No data loss since we're only adding.

**Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `Prisma Client generated successfully`

**Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 6: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/prisma/schema.prisma
git commit -m "feat: add UserProfile and AdvisorRecommendation schema models"
```

---

## Task 2: Validation Schemas for New Models

Add Zod validation schemas for profile and advisor endpoints.

**Files:**
- Modify: `personal-finance/src/lib/validation.ts`

**Step 1: Add validation schemas**

Add these at the end of `personal-finance/src/lib/validation.ts`:

```typescript
// --- User Profile ---

export const createProfileSchema = z.object({
  age: z.number().int().min(13).max(120),
  annualIncome: z.number().min(0),
  riskTolerance: z.enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]),
  filingStatus: z.enum(["SINGLE", "MARRIED_FILING_JOINTLY", "MARRIED_FILING_SEPARATELY", "HEAD_OF_HOUSEHOLD"]).optional().nullable(),
  employmentType: z.enum(["W2", "SELF_EMPLOYED_1099", "RETIRED", "STUDENT", "OTHER"]).optional().nullable(),
  stateOfResidence: z.string().optional().nullable(),
  employer401kMatch: z.string().optional().nullable(),
  dependents: z.number().int().min(0).optional().nullable(),
  isHomeowner: z.boolean().optional().nullable(),
  monthlyTakeHome: z.number().min(0).optional().nullable(),
});

// --- Advisor ---

export const dismissRecommendationSchema = z.object({
  id: z.string().min(1),
});
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/lib/validation.ts
git commit -m "feat: add validation schemas for profile and advisor"
```

---

## Task 3: User Profile API

Create GET/PUT endpoint for user financial profile.

**Files:**
- Create: `personal-finance/src/app/api/profile/route.ts`

**Step 1: Create profile API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { createProfileSchema } from "@/lib/validation";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...parsed.data },
      update: parsed.data,
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/app/api/profile/route.ts
git commit -m "feat: add user profile API endpoint"
```

---

## Task 4: Crypto Prices API

Server-side endpoint to fetch crypto prices from CoinGecko.

**Files:**
- Create: `personal-finance/src/app/api/crypto-prices/route.ts`

**Step 1: Create crypto prices API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/session";

// Map common tickers to CoinGecko IDs
const TICKER_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  XRP: "ripple",
  DOGE: "dogecoin",
  LTC: "litecoin",
};

// Simple in-memory cache (5 min TTL)
let priceCache: { data: Record<string, number>; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickers = request.nextUrl.searchParams.get("tickers");
  if (!tickers) {
    return NextResponse.json({ error: "tickers parameter required" }, { status: 400 });
  }

  const tickerList = tickers.split(",").map((t) => t.trim().toUpperCase());
  const geckoIds = tickerList
    .map((t) => TICKER_TO_COINGECKO[t])
    .filter(Boolean);

  if (geckoIds.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  // Return cache if fresh
  if (priceCache && Date.now() - priceCache.fetchedAt < CACHE_TTL) {
    const result: Record<string, number> = {};
    for (const ticker of tickerList) {
      const geckoId = TICKER_TO_COINGECKO[ticker];
      if (geckoId && priceCache.data[geckoId]) {
        result[ticker] = priceCache.data[geckoId];
      }
    }
    return NextResponse.json({ prices: result });
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(",")}&vs_currencies=usd`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      return NextResponse.json({ error: "CoinGecko API error" }, { status: 502 });
    }

    const data = await res.json();

    // Update cache
    const allPrices: Record<string, number> = {};
    for (const [geckoId, priceData] of Object.entries(data)) {
      allPrices[geckoId] = (priceData as { usd: number }).usd;
    }
    priceCache = { data: allPrices, fetchedAt: Date.now() };

    // Map back to tickers
    const result: Record<string, number> = {};
    for (const ticker of tickerList) {
      const geckoId = TICKER_TO_COINGECKO[ticker];
      if (geckoId && allPrices[geckoId]) {
        result[ticker] = allPrices[geckoId];
      }
    }

    return NextResponse.json({ prices: result });
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/app/api/crypto-prices/route.ts
git commit -m "feat: add crypto prices API with CoinGecko integration"
```

---

## Task 5: Auto Snapshot Cron Endpoint

Create a cron-safe endpoint that takes daily snapshots, and add a cron script.

**Files:**
- Modify: `personal-finance/src/app/api/snapshots/route.ts` (add cron-safe POST variant)
- Create: `scripts/daily-snapshot.sh`

**Step 1: Add cron-triggered auto-snapshot endpoint**

Create `personal-finance/src/app/api/snapshots/auto/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all users who have accounts
    const users = await prisma.user.findMany({
      where: { accounts: { some: {} } },
      select: { id: true },
    });

    const today = startOfDay(new Date());
    let created = 0;

    for (const user of users) {
      // Check if snapshot already exists for today
      const existing = await prisma.snapshot.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: today },
        },
      });

      if (existing) continue;

      const holdings = await prisma.holding.findMany({
        where: { account: { userId: user.id } },
      });

      const netWorth = holdings.reduce((sum, h) => sum + h.value, 0);

      await prisma.snapshot.create({
        data: {
          netWorth,
          userId: user.id,
          holdings: {
            create: holdings.map((h) => ({
              name: h.name,
              category: h.category,
              value: h.value,
            })),
          },
        },
      });

      created++;
    }

    return NextResponse.json({ created, total: users.length });
  } catch (error) {
    console.error("Error creating auto snapshots:", error);
    return NextResponse.json({ error: "Failed to create snapshots" }, { status: 500 });
  }
}
```

**Step 2: Add CRON_SECRET to environment**

Add to `personal-finance/.env`:

```
CRON_SECRET=<generate-a-random-string>
```

Generate a random secret:

```bash
openssl rand -hex 32
```

**Step 3: Create daily cron script**

Create `scripts/daily-snapshot.sh`:

```bash
#!/bin/bash
# Daily snapshot cron - runs inside docker network
CRON_SECRET=$(grep CRON_SECRET /home/allen/whatisms/personal-finance/.env | cut -d= -f2)
curl -s -X POST http://finance:3000/finance/api/snapshots/auto \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

```bash
chmod +x scripts/daily-snapshot.sh
```

**Step 4: Add cron to docker-compose.yml**

Add a cron service to `docker-compose.yml` after the caddy service:

```yaml
  cron:
    image: alpine:3.20
    command: >
      sh -c "echo '0 3 * * * /scripts/daily-snapshot.sh >> /var/log/cron.log 2>&1' | crontab - && crond -f"
    volumes:
      - ./scripts:/scripts:ro
      - ./personal-finance/.env:/env:ro
    depends_on:
      finance:
        condition: service_healthy
    restart: unless-stopped
```

Wait — this won't work well because the cron container needs to resolve `finance:3000` in the docker network. A simpler approach: use `docker compose exec` from the host. But on the Hetzner server, we can use a system cron that calls curl against localhost.

Let me revise. Since Caddy exposes the finance app, and the auto endpoint checks a secret, we can hit it from the host:

Create `scripts/daily-snapshot.sh`:

```bash
#!/bin/bash
# Daily snapshot cron - called from host crontab
source /home/allen/whatisms/personal-finance/.env
curl -s -X POST http://localhost:3000/finance/api/snapshots/auto \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

Actually, the finance container isn't port-mapped to the host (only Caddy is exposed). Let's use `docker compose exec`:

Create `scripts/daily-snapshot.sh`:

```bash
#!/bin/bash
# Daily snapshot cron - runs via docker compose exec
cd /home/allen/whatisms
source personal-finance/.env
docker compose exec -T finance node -e "
  const http = require('http');
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/finance/api/snapshots/auto',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${CRON_SECRET}',
      'Content-Type': 'application/json'
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log(data));
  });
  req.end();
"
```

```bash
chmod +x scripts/daily-snapshot.sh
```

We'll set up the actual crontab on the server during deployment (Task 10).

**Step 5: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

**Step 6: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/app/api/snapshots/auto/route.ts scripts/daily-snapshot.sh
git commit -m "feat: add auto-snapshot cron endpoint and script"
```

---

## Task 6: Advisor API — Generate Recommendations

AI-powered endpoint that generates Boglehead-based recommendations.

**Files:**
- Create: `personal-finance/src/app/api/advisor/route.ts`
- Create: `personal-finance/src/lib/advisor.ts` (Boglehead logic)

**Step 1: Create Boglehead advisor logic**

Create `personal-finance/src/lib/advisor.ts`:

```typescript
// Boglehead-inspired target allocation based on age and risk tolerance
export function getTargetAllocation(age: number, riskTolerance: string) {
  // Base: bonds% = age (classic Boglehead rule)
  // Adjust for risk tolerance
  let bondPercent: number;
  switch (riskTolerance) {
    case "AGGRESSIVE":
      bondPercent = Math.max(10, age - 20);
      break;
    case "CONSERVATIVE":
      bondPercent = Math.min(80, age + 10);
      break;
    default: // MODERATE
      bondPercent = age;
  }

  const stockPercent = 100 - bondPercent;
  // Split stocks: ~60% domestic, ~40% international (Boglehead recommendation)
  const domesticPercent = Math.round(stockPercent * 0.6);
  const internationalPercent = stockPercent - domesticPercent;

  return {
    bonds: bondPercent,
    domesticStocks: domesticPercent,
    internationalStocks: internationalPercent,
    total: 100,
  };
}

// Map asset categories to allocation buckets
export function categorizeAllocation(holdings: { category: string; value: number }[]) {
  const total = holdings.reduce((s, h) => s + h.value, 0);
  if (total === 0) return { stocks: 0, bonds: 0, cash: 0, crypto: 0, realEstate: 0, other: 0, total: 0 };

  const buckets = { stocks: 0, bonds: 0, cash: 0, crypto: 0, realEstate: 0, other: 0 };

  for (const h of holdings) {
    switch (h.category) {
      case "STOCK":
      case "ETF":
      case "MUTUAL_FUND":
        buckets.stocks += h.value;
        break;
      case "BOND":
        buckets.bonds += h.value;
        break;
      case "CASH":
        buckets.cash += h.value;
        break;
      case "CRYPTO":
        buckets.crypto += h.value;
        break;
      case "REAL_ESTATE":
        buckets.realEstate += h.value;
        break;
      default:
        buckets.other += h.value;
    }
  }

  return { ...buckets, total };
}

// Average monthly costs by category (BLS Consumer Expenditure Survey approximations)
export const AVERAGE_MONTHLY_COSTS: Record<string, number> = {
  "Phone": 55,
  "Internet": 65,
  "Streaming": 35,
  "Insurance": 200,
  "Utilities": 150,
  "Gym": 40,
};

// Suggested Boglehead funds
export const BOGLEHEAD_FUNDS = {
  domesticStocks: { ticker: "VTI", name: "Vanguard Total Stock Market ETF" },
  internationalStocks: { ticker: "VXUS", name: "Vanguard Total International Stock ETF" },
  bonds: { ticker: "BND", name: "Vanguard Total Bond Market ETF" },
  total: { ticker: "VT", name: "Vanguard Total World Stock ETF" },
};

// Contribution priority order (Boglehead philosophy)
export const CONTRIBUTION_ORDER = [
  "Employer 401(k) match (free money)",
  "Pay off high-interest debt (>6% APR)",
  "Roth IRA ($7,000/year limit for 2024-2025)",
  "Max out 401(k) ($23,500/year limit for 2025)",
  "HSA if eligible ($4,300 single / $8,550 family for 2025)",
  "Taxable brokerage account",
];
```

**Step 2: Create advisor API endpoint**

Create `personal-finance/src/app/api/advisor/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  getTargetAllocation,
  categorizeAllocation,
  AVERAGE_MONTHLY_COSTS,
  BOGLEHEAD_FUNDS,
  CONTRIBUTION_ORDER,
} from "@/lib/advisor";
import { startOfMonth, subMonths } from "date-fns";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recommendations = await prisma.advisorRecommendation.findMany({
    where: { userId: user.id, isDismissed: false },
    orderBy: { priority: "desc" },
  });

  return NextResponse.json(recommendations);
}

export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile required. Set up your financial profile first." },
        { status: 400 }
      );
    }

    // Gather financial data
    const [accounts, holdings, bills, transactions] = await Promise.all([
      prisma.account.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, type: true, institution: true },
      }),
      prisma.holding.findMany({
        where: { account: { userId: user.id } },
        select: { category: true, value: true, name: true, ticker: true },
      }),
      prisma.bill.findMany({
        where: { userId: user.id },
        select: { name: true, amount: true, category: true },
      }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: {
          account: { userId: user.id },
          date: { gte: startOfMonth(subMonths(new Date(), 3)) },
          amount: { gt: 0 },
          pending: false,
        },
        _sum: { amount: true },
      }),
    ]);

    const recommendations: {
      type: string;
      category: string;
      title: string;
      summary: string;
      details: string | null;
      priority: number;
      data: string | null;
    }[] = [];

    // --- 1. Asset Allocation Analysis ---
    const allocation = categorizeAllocation(holdings);
    const target = getTargetAllocation(profile.age, profile.riskTolerance);

    if (allocation.total > 0) {
      const currentStockPct = ((allocation.stocks) / allocation.total) * 100;
      const currentBondPct = (allocation.bonds / allocation.total) * 100;
      const targetStockPct = target.domesticStocks + target.internationalStocks;

      if (Math.abs(currentStockPct - targetStockPct) > 10) {
        const direction = currentStockPct > targetStockPct ? "overweight stocks" : "underweight stocks";
        recommendations.push({
          type: "ALLOCATION",
          category: "Asset Allocation",
          title: `You're ${direction}`,
          summary: `At age ${profile.age} with ${profile.riskTolerance.toLowerCase()} risk tolerance, Bogleheads suggest ~${targetStockPct}% stocks / ~${target.bonds}% bonds. You're at ${currentStockPct.toFixed(0)}% stocks / ${currentBondPct.toFixed(0)}% bonds.`,
          details: `The Boglehead approach recommends a bond allocation roughly equal to your age (${profile.age}%). Consider rebalancing gradually through new contributions rather than selling existing positions to avoid tax events.`,
          priority: 8,
          data: JSON.stringify({ current: { stocks: currentStockPct, bonds: currentBondPct }, target }),
        });
      }

      // What to buy next
      const stockGap = targetStockPct - currentStockPct;
      const bondGap = target.bonds - currentBondPct;
      const largestGap = Math.abs(stockGap) > Math.abs(bondGap) ? "stocks" : "bonds";

      if (Math.abs(stockGap) > 5 || Math.abs(bondGap) > 5) {
        const fund = largestGap === "stocks" ? BOGLEHEAD_FUNDS.domesticStocks : BOGLEHEAD_FUNDS.bonds;
        recommendations.push({
          type: "WHAT_TO_BUY",
          category: "Asset Allocation",
          title: `Next purchase: consider ${fund.ticker}`,
          summary: `You're ${Math.abs(largestGap === "stocks" ? stockGap : bondGap).toFixed(0)}% underweight in ${largestGap}. With your next investment, consider ${fund.name} (${fund.ticker}).`,
          details: `${fund.name} is a low-cost, broadly diversified index fund — a Boglehead staple. Expense ratio is among the lowest in the industry.`,
          priority: 7,
          data: JSON.stringify({ fund, gap: largestGap === "stocks" ? stockGap : bondGap }),
        });
      }
    }

    // --- 2. Account Structure Analysis ---
    const accountTypes = new Set(accounts.map((a) => a.type));
    const hasBrokerage = accountTypes.has("BROKERAGE");
    const cashValue = allocation.cash;

    if (cashValue > 10000 && !hasBrokerage) {
      recommendations.push({
        type: "ACCOUNT_STRUCTURE",
        category: "Account Structure",
        title: "Consider opening a brokerage account",
        summary: `You have $${cashValue.toLocaleString()} in cash. A brokerage account would let you invest in low-cost index funds for long-term growth.`,
        details: CONTRIBUTION_ORDER.map((s, i) => `${i + 1}. ${s}`).join("\n"),
        priority: 9,
        data: null,
      });
    }

    if (cashValue > 25000) {
      recommendations.push({
        type: "ACCOUNT_STRUCTURE",
        category: "Account Structure",
        title: "Large cash position — consider tax-advantaged accounts",
        summary: `You have $${cashValue.toLocaleString()} in cash/savings. Consider maximizing contributions to tax-advantaged accounts (Roth IRA: $7,000/yr, 401k: $23,500/yr) before holding excess cash.`,
        details: `Boglehead priority: ${CONTRIBUTION_ORDER.slice(0, 4).join(" > ")}. Cash beyond 3-6 months of expenses is typically better deployed in investments.`,
        priority: 9,
        data: JSON.stringify({ cashValue, monthlyExpenses: null }),
      });
    }

    // --- 3. Cost Optimization ---
    for (const bill of bills) {
      const normalizedName = bill.name.toLowerCase();
      for (const [costCategory, avgCost] of Object.entries(AVERAGE_MONTHLY_COSTS)) {
        if (normalizedName.includes(costCategory.toLowerCase()) && bill.amount > avgCost * 1.3) {
          recommendations.push({
            type: "COST_OPTIMIZATION",
            category: "Cost Savings",
            title: `${bill.name} may be above average`,
            summary: `Your ${bill.name} is $${bill.amount.toFixed(0)}/mo — the average is ~$${avgCost}/mo. You might save $${(bill.amount - avgCost).toFixed(0)}/mo by shopping around.`,
            details: null,
            priority: 4,
            data: JSON.stringify({ bill: bill.name, current: bill.amount, average: avgCost }),
          });
        }
      }
    }

    // --- 4. AI-powered spending analysis ---
    if (process.env.ANTHROPIC_API_KEY && transactions.length > 0) {
      try {
        const spendingData = Object.fromEntries(
          transactions.map((t) => [t.category, ((t._sum.amount || 0) / 3).toFixed(2)])
        );

        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `You are a Boglehead-philosophy personal finance advisor. Analyze this user's average monthly spending and provide 2-3 specific, actionable recommendations. Be direct and mention dollar amounts.

User profile: Age ${profile.age}, income $${profile.annualIncome.toLocaleString()}/yr, risk tolerance: ${profile.riskTolerance}

Average monthly spending by category (last 3 months):
${JSON.stringify(spendingData, null, 2)}

Monthly bills: ${bills.map((b) => `${b.name}: $${b.amount}`).join(", ") || "none tracked"}

Portfolio value: $${allocation.total.toLocaleString()} (Stocks: ${((allocation.stocks / (allocation.total || 1)) * 100).toFixed(0)}%, Bonds: ${((allocation.bonds / (allocation.total || 1)) * 100).toFixed(0)}%, Cash: ${((allocation.cash / (allocation.total || 1)) * 100).toFixed(0)}%)

Reply with a JSON array of objects, each with "title" (short), "summary" (1-2 sentences), and "priority" (1-10). No markdown, just the JSON array.`,
          }],
        });

        const aiText = response.content[0].type === "text" ? response.content[0].text : "";
        try {
          const aiRecs = JSON.parse(aiText);
          if (Array.isArray(aiRecs)) {
            for (const rec of aiRecs.slice(0, 3)) {
              recommendations.push({
                type: "SPENDING",
                category: "Spending Trends",
                title: rec.title || "Spending insight",
                summary: rec.summary || "",
                details: null,
                priority: Math.min(10, Math.max(1, rec.priority || 5)),
                data: JSON.stringify(spendingData),
              });
            }
          }
        } catch {
          // AI didn't return valid JSON, skip
        }
      } catch (error) {
        console.error("Error generating AI advisor insight:", error);
      }
    }

    // Clear old non-dismissed recommendations and save new ones
    await prisma.advisorRecommendation.deleteMany({
      where: { userId: user.id, isDismissed: false },
    });

    if (recommendations.length > 0) {
      await prisma.advisorRecommendation.createMany({
        data: recommendations.map((r) => ({ ...r, userId: user.id })),
      });
    }

    const saved = await prisma.advisorRecommendation.findMany({
      where: { userId: user.id, isDismissed: false },
      orderBy: { priority: "desc" },
    });

    return NextResponse.json({ generated: recommendations.length, recommendations: saved });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
```

**Step 3: Create dismiss endpoint**

Create `personal-finance/src/app/api/advisor/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const recommendation = await prisma.advisorRecommendation.update({
      where: { id, userId: user.id },
      data: { isDismissed: true, dismissedAt: new Date() },
    });

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("Error dismissing recommendation:", error);
    return NextResponse.json({ error: "Failed to dismiss" }, { status: 500 });
  }
}
```

**Step 4: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

**Step 5: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/lib/advisor.ts personal-finance/src/app/api/advisor/
git commit -m "feat: add Boglehead advisor API with AI recommendations"
```

---

## Task 7: Update Sidebar — 10 Tabs to 4

Replace the current 10-tab navigation with 4 tabs.

**Files:**
- Modify: `personal-finance/src/components/Sidebar.tsx`

**Step 1: Replace navItems and group definitions**

Replace lines 9-26 of `Sidebar.tsx` with:

```typescript
const navItems = [
  { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", group: "main" },
  { href: "/accounts", label: "Accounts", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", group: "main" },
  { href: "/money-flow", label: "Money Flow", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", group: "main" },
  { href: "/advisor", label: "Advisor", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", group: "main" },
];

const groupLabels: Record<string, string> = {
  main: "",
};
```

**Step 2: Remove the group label rendering**

In the nav rendering section (around line 80), since we only have one group with no label, update the group rendering to skip the label when it's empty. Replace the `<p>` tag for group labels:

```tsx
{groupLabels[group] && (
  <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-muted/60">
    {groupLabels[group]}
  </p>
)}
```

Also update the groups array:

```typescript
const groups = ["main"];
```

**Step 3: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

**Step 4: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/components/Sidebar.tsx
git commit -m "feat: consolidate sidebar from 10 tabs to 4"
```

---

## Task 8: Enhanced Dashboard — Merge History + Breakdown

Rebuild the dashboard to include net worth history chart and allocation breakdown.

**Files:**
- Modify: `personal-finance/src/app/page.tsx`
- Create: `personal-finance/src/app/NetWorthHistorySection.tsx` (client component for time range toggle)

**Step 1: Create NetWorthHistorySection client component**

Create `personal-finance/src/app/NetWorthHistorySection.tsx`:

```tsx
"use client";

import { useState } from "react";
import NetWorthHistory from "@/components/NetWorthHistory";

interface SnapshotData {
  date: string;
  netWorth: number;
}

interface Props {
  allData: SnapshotData[];
  projectionData?: SnapshotData[];
}

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: 0 },
] as const;

export default function NetWorthHistorySection({ allData, projectionData }: Props) {
  const [range, setRange] = useState<string>("All");

  const filtered = range === "All"
    ? allData
    : allData.filter((d) => {
        const cutoff = Date.now() - RANGES.find((r) => r.label === range)!.days * 86400000;
        return new Date(d.date).getTime() >= cutoff;
      });

  return (
    <div>
      <div className="flex items-center justify-end gap-1 mb-2">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.label)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              range === r.label
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground hover:bg-accent-light/50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <NetWorthHistory data={filtered} projectionData={range === "All" ? projectionData : undefined} />
    </div>
  );
}
```

**Step 2: Rewrite the dashboard page**

Replace the entire content of `personal-finance/src/app/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import NetWorthCard from "@/components/NetWorthCard";
import AllocationChart from "@/components/AllocationChart";
import AccountCard from "@/components/AccountCard";
import CashFlowForecast from "@/components/CashFlowForecast";
import HoldingsTable from "@/components/HoldingsTable";
import NetWorthHistorySection from "./NetWorthHistorySection";
import {
  ASSET_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  formatCurrency,
  formatPercent,
} from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [accounts, snapshots] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      include: { holdings: true },
    }),
    prisma.snapshot.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Pre-compute per-account values
  const accountsWithValue = accounts
    .map((a) => ({
      ...a,
      totalValue: a.holdings.reduce((sum, h) => sum + h.value, 0),
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const allHoldings = accounts.flatMap((a) => a.holdings);
  const netWorth = allHoldings.reduce((sum, h) => sum + h.value, 0);

  // Allocation data
  const allocationData = ASSET_CATEGORIES.map((category) => ({
    category,
    value: allHoldings
      .filter((h) => h.category === category)
      .reduce((sum, h) => sum + h.value, 0),
  }));

  // Category breakdown for detailed table (merged from Breakdown page)
  const categoryBreakdown = ASSET_CATEGORIES.map((category) => {
    const categoryHoldings = allHoldings.filter((h) => h.category === category);
    const categoryValue = categoryHoldings.reduce((sum, h) => sum + h.value, 0);
    return {
      category,
      label: CATEGORY_LABELS[category],
      color: CATEGORY_COLORS[category],
      value: categoryValue,
      percent: netWorth > 0 ? (categoryValue / netWorth) * 100 : 0,
      holdings: categoryHoldings,
      count: categoryHoldings.length,
    };
  }).filter((c) => c.count > 0);

  // Net worth history chart data (merged from History page)
  const chartData = snapshots.map((s) => ({
    date: s.createdAt.toISOString(),
    netWorth: s.netWorth,
  }));

  // Linear regression projection
  let projectionData: { date: string; netWorth: number }[] | undefined;
  if (snapshots.length >= 5) {
    const points = snapshots.map((s) => ({
      x: s.createdAt.getTime(),
      y: s.netWorth,
    }));
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const lastDate = points[points.length - 1].x;
    const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;

    projectionData = [3, 6, 12].map((months) => {
      const futureDate = new Date(lastDate + months * msPerMonth);
      return {
        date: futureDate.toISOString(),
        netWorth: Math.round(slope * futureDate.getTime() + intercept),
      };
    });
  }

  // Net worth trend (change from last snapshot)
  const lastSnapshot = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const netWorthChange = lastSnapshot ? netWorth - lastSnapshot.netWorth : 0;
  const netWorthChangePct = lastSnapshot && lastSnapshot.netWorth > 0
    ? (netWorthChange / lastSnapshot.netWorth) * 100
    : 0;

  const activeAccounts = accountsWithValue.filter((a) => a.totalValue > 0);
  const zeroAccounts = accountsWithValue.filter((a) => a.totalValue === 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted text-sm mt-1">Overview of your portfolio</p>
      </div>

      <NetWorthCard
        netWorth={netWorth}
        accountCount={accounts.length}
        holdingCount={allHoldings.length}
      />

      {/* Net Worth History (merged from History page) */}
      {chartData.length > 0 && (
        <NetWorthHistorySection allData={chartData} projectionData={projectionData} />
      )}

      {/* Asset Allocation Chart + Category Breakdown (merged from Breakdown page) */}
      <AllocationChart data={allocationData} />

      {categoryBreakdown.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h3 className="text-sm font-medium text-muted mb-4">
            Allocation Breakdown
          </h3>
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium">{cat.label}</span>
                    <span className="text-muted">
                      ({cat.count} holding{cat.count !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted">
                      {formatPercent(cat.percent)}
                    </span>
                    <span className="font-semibold w-28 text-right">
                      {formatCurrency(cat.value)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-card-border rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${cat.percent}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CashFlowForecast />

      {/* Account Cards */}
      {accountsWithValue.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-muted mb-3">Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAccounts.map((account) => (
              <AccountCard
                key={account.id}
                name={account.name}
                institution={account.institution}
                type={account.type}
                totalValue={account.totalValue}
                holdingCount={account.holdings.length}
              />
            ))}
          </div>
          {zeroAccounts.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
                {zeroAccounts.length} accounts with $0 balance
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3 opacity-60">
                {zeroAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    name={account.name}
                    institution={account.institution}
                    type={account.type}
                    totalValue={0}
                    holdingCount={account.holdings.length}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <p className="text-muted text-sm">
            No accounts yet. Go to{" "}
            <Link href="/accounts" className="text-accent hover:underline">
              Accounts
            </Link>{" "}
            to add your first account.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

**Step 4: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/app/page.tsx personal-finance/src/app/NetWorthHistorySection.tsx
git commit -m "feat: enhanced dashboard with history chart and allocation breakdown"
```

---

## Task 9: Inline Holding Editing on Accounts Page

Add inline price/quantity editing for manual holdings in the HoldingsTable.

**Files:**
- Create: `personal-finance/src/components/EditableHoldingsTable.tsx`
- Modify: `personal-finance/src/app/accounts/page.tsx`

**Step 1: Create EditableHoldingsTable component**

Create `personal-finance/src/components/EditableHoldingsTable.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CATEGORY_COLORS, CATEGORY_LABELS, formatCurrencyExact } from "@/lib/categories";
import PrivacyValue from "@/components/PrivacyValue";

interface Holding {
  id: string;
  name: string;
  ticker: string | null;
  category: string;
  quantity: number;
  price: number;
  value: number;
  totalCostBasis?: number;
  gainLoss?: number;
  gainLossPercent?: number;
}

interface EditableHoldingsTableProps {
  holdings: Holding[];
  totalValue: number;
  editable?: boolean;
}

export default function EditableHoldingsTable({ holdings, totalValue, editable = false }: EditableHoldingsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<"price" | "quantity" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [localHoldings, setLocalHoldings] = useState(holdings);

  if (localHoldings.length === 0) {
    return (
      <div className="text-center py-12 text-muted text-sm">
        No holdings yet.
      </div>
    );
  }

  async function handleSave(holdingId: string) {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) {
      setEditingId(null);
      setEditField(null);
      return;
    }

    setSaving(true);
    try {
      const holding = localHoldings.find((h) => h.id === holdingId);
      if (!holding) return;

      const updates = {
        id: holdingId,
        name: holding.name,
        category: holding.category,
        quantity: editField === "quantity" ? num : holding.quantity,
        price: editField === "price" ? num : holding.price,
        ticker: holding.ticker,
      };

      const res = await fetch("/finance/api/holdings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        setLocalHoldings((prev) =>
          prev.map((h) =>
            h.id === holdingId
              ? {
                  ...h,
                  [editField!]: num,
                  value: editField === "price" ? num * h.quantity : h.price * num,
                }
              : h
          )
        );
      }
    } finally {
      setSaving(false);
      setEditingId(null);
      setEditField(null);
    }
  }

  function startEdit(holdingId: string, field: "price" | "quantity", currentValue: number) {
    setEditingId(holdingId);
    setEditField(field);
    setEditValue(currentValue.toString());
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-card-border text-left text-muted text-xs uppercase tracking-wider">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium pl-4">Category</th>
            <th className="pb-3 font-medium text-right pl-4">Quantity</th>
            <th className="pb-3 font-medium text-right pl-4">Price</th>
            <th className="pb-3 font-medium text-right pl-4">Value</th>
            <th className="pb-3 font-medium text-right pl-4">Gain/Loss</th>
            <th className="pb-3 font-medium text-right pl-4">% of Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border/50">
          {localHoldings.map((holding) => (
            <tr key={holding.id} className="hover:bg-accent-light/30 transition-colors">
              <td className="py-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{holding.name}</span>
                  {holding.ticker && (
                    <span className="shrink-0 text-xs text-muted bg-accent-light px-1.5 py-0.5 rounded">{holding.ticker}</span>
                  )}
                </div>
              </td>
              <td className="py-3 pl-4">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[holding.category] || CATEGORY_COLORS.OTHER }}
                  />
                  {CATEGORY_LABELS[holding.category] || holding.category}
                </span>
              </td>

              {/* Editable Quantity */}
              <td className="py-3 text-right tabular-nums pl-4">
                {editable && editingId === holding.id && editField === "quantity" ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSave(holding.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave(holding.id);
                      if (e.key === "Escape") { setEditingId(null); setEditField(null); }
                    }}
                    className="w-24 text-right bg-transparent border border-accent rounded px-1 py-0.5 text-sm focus:outline-none"
                    autoFocus
                    disabled={saving}
                  />
                ) : (
                  <span
                    className={editable ? "cursor-pointer hover:bg-accent-light/50 px-1 py-0.5 rounded" : ""}
                    onClick={() => editable && startEdit(holding.id, "quantity", holding.quantity)}
                    title={editable ? "Click to edit" : undefined}
                  >
                    <PrivacyValue>{holding.quantity.toLocaleString()}</PrivacyValue>
                  </span>
                )}
              </td>

              {/* Editable Price */}
              <td className="py-3 text-right tabular-nums pl-4">
                {editable && editingId === holding.id && editField === "price" ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSave(holding.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave(holding.id);
                      if (e.key === "Escape") { setEditingId(null); setEditField(null); }
                    }}
                    className="w-28 text-right bg-transparent border border-accent rounded px-1 py-0.5 text-sm focus:outline-none"
                    autoFocus
                    disabled={saving}
                  />
                ) : (
                  <span
                    className={editable ? "cursor-pointer hover:bg-accent-light/50 px-1 py-0.5 rounded" : ""}
                    onClick={() => editable && startEdit(holding.id, "price", holding.price)}
                    title={editable ? "Click to edit" : undefined}
                  >
                    <PrivacyValue>{formatCurrencyExact(holding.price)}</PrivacyValue>
                  </span>
                )}
              </td>

              <td className="py-3 text-right font-medium tabular-nums pl-4">
                <PrivacyValue>{formatCurrencyExact(holding.value)}</PrivacyValue>
              </td>
              <td className="py-3 text-right tabular-nums pl-4">
                {holding.totalCostBasis && holding.totalCostBasis > 0 ? (
                  <span className={holding.gainLoss && holding.gainLoss >= 0 ? "text-success" : "text-danger"}>
                    <PrivacyValue>
                      {holding.gainLoss && holding.gainLoss >= 0 ? "+" : ""}
                      {formatCurrencyExact(holding.gainLoss || 0)}
                      <span className="text-xs ml-1">
                        ({holding.gainLossPercent && holding.gainLossPercent >= 0 ? "+" : ""}
                        {(holding.gainLossPercent || 0).toFixed(1)}%)
                      </span>
                    </PrivacyValue>
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="py-3 text-right text-muted tabular-nums pl-4">
                {totalValue > 0 ? ((holding.value / totalValue) * 100).toFixed(1) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Update Accounts page to use EditableHoldingsTable**

In `personal-finance/src/app/accounts/page.tsx`, add the import at the top (after existing imports):

```typescript
import EditableHoldingsTable from "@/components/EditableHoldingsTable";
```

Then replace the `HoldingsTable` usage (around line 172-175) with `EditableHoldingsTable`, passing `editable={!isAutoSynced}`:

Replace:
```tsx
<HoldingsTable
  holdings={account.holdings.map(computeGainLoss)}
  totalValue={totalValue}
/>
```

With:
```tsx
<EditableHoldingsTable
  holdings={account.holdings.map(computeGainLoss)}
  totalValue={totalValue}
  editable={!isAutoSynced}
/>
```

**Step 3: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

**Step 4: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/components/EditableHoldingsTable.tsx personal-finance/src/app/accounts/page.tsx
git commit -m "feat: inline price/quantity editing for manual holdings"
```

---

## Task 10: Money Flow Page

Create the consolidated Money Flow page replacing Spending, Budgets, Bills, and Transactions.

**Files:**
- Create: `personal-finance/src/app/money-flow/page.tsx`
- Create: `personal-finance/src/app/money-flow/MonthlyChart.tsx`
- Move/reuse: Existing components (TransactionTable, CategoryRulesManager, BillCard, AddBillForm, etc.)

**Step 1: Create MonthlyChart client component**

Create `personal-finance/src/app/money-flow/MonthlyChart.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/categories";

interface MonthlyData {
  month: string;
  income: number;
  spending: number;
}

export default function MonthlyChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <h3 className="text-sm font-medium text-muted mb-4">Income vs Spending</h3>
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              axisLine={{ stroke: "var(--card-border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              axisLine={{ stroke: "var(--card-border)" }}
              tickLine={false}
              tickFormatter={(val) => formatCurrency(val)}
              width={80}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "income" ? "Income" : "Spending",
              ]}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Legend formatter={(value: string) => value === "income" ? "Income" : "Spending"} />
            <Bar dataKey="income" fill="var(--success)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="spending" fill="var(--danger)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**Step 2: Create the Money Flow page**

Create `personal-finance/src/app/money-flow/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import {
  formatCurrency,
  SPENDING_CATEGORY_COLORS,
  SPENDING_CATEGORY_LABELS,
} from "@/lib/categories";
import { startOfMonth, subMonths, format } from "date-fns";
import MonthlyChart from "./MonthlyChart";
import TransactionTable from "../transactions/TransactionTable";
import CategoryRulesManager from "../transactions/CategoryRulesManager";
import RecurringCharges from "../spending/RecurringCharges";
import SyncTransactionsButton from "../spending/SyncTransactionsButton";
import BillCard from "../bills/BillCard";
import AddBillForm from "../bills/AddBillForm";
import BillSuggestions from "../bills/BillSuggestion";
import ResetBillsButton from "../bills/ResetBillsButton";
import AddBudgetForm from "../budgets/AddBudgetForm";
import DeleteBudgetButton from "../budgets/DeleteBudgetButton";

export const dynamic = "force-dynamic";

export default async function MoneyFlowPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const thisMonthStart = startOfMonth(now);

  // Fetch all needed data in parallel
  const [
    thisMonthTxns,
    recurringTxns,
    budgets,
    bills,
    accounts,
    transactionCategories,
    monthlyData,
  ] = await Promise.all([
    // This month's transactions
    prisma.transaction.findMany({
      where: {
        account: { userId: user.id },
        date: { gte: thisMonthStart },
        pending: false,
      },
      include: { account: true },
    }),
    // Recurring transactions
    prisma.transaction.findMany({
      where: {
        account: { userId: user.id },
        isRecurring: true,
        amount: { gt: 0 },
      },
      orderBy: { merchantName: "asc" },
    }),
    // Budget goals
    prisma.budgetGoal.findMany({
      where: { userId: user.id },
      orderBy: { category: "asc" },
    }),
    // Bills
    prisma.bill.findMany({
      where: { userId: user.id },
      orderBy: { dueDay: "asc" },
    }),
    // Accounts for filtering
    prisma.account.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, institution: true },
      orderBy: { name: "asc" },
    }),
    // Transaction categories
    prisma.transaction.groupBy({
      by: ["category"],
      where: { account: { userId: user.id } },
      orderBy: { category: "asc" },
    }),
    // Monthly totals for last 6 months
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = startOfMonth(subMonths(now, i - 1));
        return Promise.all([
          prisma.transaction.aggregate({
            where: {
              account: { userId: user.id },
              date: { gte: monthStart, lt: monthEnd },
              amount: { gt: 0 },
              pending: false,
            },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: {
              account: { userId: user.id },
              date: { gte: monthStart, lt: monthEnd },
              amount: { lt: 0 },
              pending: false,
            },
            _sum: { amount: true },
          }),
        ]).then(([spending, income]) => ({
          month: format(monthStart, "MMM"),
          spending: spending._sum.amount || 0,
          income: Math.abs(income._sum.amount || 0),
        }));
      })
    ).then((data) => data.reverse()),
  ]);

  // Summary calculations
  const thisMonthSpending = thisMonthTxns
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const thisMonthIncome = Math.abs(
    thisMonthTxns
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );
  const netSavings = thisMonthIncome - thisMonthSpending;
  const savingsRate = thisMonthIncome > 0 ? (netSavings / thisMonthIncome) * 100 : 0;

  // Spending by category
  const categoryTotals = new Map<string, number>();
  for (const txn of thisMonthTxns.filter((t) => t.amount > 0)) {
    categoryTotals.set(txn.category, (categoryTotals.get(txn.category) || 0) + txn.amount);
  }

  const spendingMap = new Map(categoryTotals);

  const categoryData = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({
      category,
      label: SPENDING_CATEGORY_LABELS[category] || category.replace(/_/g, " "),
      color: SPENDING_CATEGORY_COLORS[category] || SPENDING_CATEGORY_COLORS.OTHER,
      amount,
      percent: thisMonthSpending > 0 ? (amount / thisMonthSpending) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Budget data
  const budgetsWithSpending = budgets.map((budget) => {
    const spent = spendingMap.get(budget.category) || 0;
    return {
      ...budget,
      spent,
      remaining: budget.limit - spent,
      percentUsed: (spent / budget.limit) * 100,
    };
  });

  const unbudgetedCategories = Array.from(categoryTotals.keys()).filter(
    (cat) => !budgets.find((b) => b.category === cat)
  );

  // Recurring charges
  const recurringGroups = new Map<string, { name: string; amount: number; count: number }>();
  for (const txn of recurringTxns) {
    const key = txn.merchantName?.toLowerCase() || txn.name.toLowerCase();
    const existing = recurringGroups.get(key);
    if (existing) {
      existing.count++;
      existing.amount = txn.amount;
    } else {
      recurringGroups.set(key, { name: txn.merchantName || txn.name, amount: txn.amount, count: 1 });
    }
  }
  const recurringList = Array.from(recurringGroups.values())
    .filter((r) => r.count >= 2)
    .sort((a, b) => b.amount - a.amount);
  const recurringTotal = recurringList.reduce((sum, r) => sum + r.amount, 0);

  // Bills with status
  const currentDay = now.getDate();
  const billsWithStatus = bills.map((bill) => {
    let status: "paid" | "due_soon" | "overdue" | "upcoming" = "upcoming";
    if (bill.isPaid) status = "paid";
    else if (currentDay > bill.dueDay) status = "overdue";
    else if (bill.dueDay - currentDay <= 3) status = "due_soon";
    return { ...bill, status };
  });

  const overdueBills = billsWithStatus.filter((b) => b.status === "overdue");
  const dueSoonBills = billsWithStatus.filter((b) => b.status === "due_soon");
  const upcomingBills = billsWithStatus.filter((b) => b.status === "upcoming");
  const paidBills = billsWithStatus.filter((b) => b.status === "paid");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Money Flow</h2>
          <p className="text-muted text-sm mt-1">
            Income, spending, bills, and budgets — {format(now, "MMMM yyyy")}
          </p>
        </div>
        <SyncTransactionsButton />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Income</p>
          <p className="text-2xl font-bold mt-1 text-success">{formatCurrency(thisMonthIncome)}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Spending</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(thisMonthSpending)}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Net Savings</p>
          <p className={`text-2xl font-bold mt-1 ${netSavings >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrency(netSavings)}
          </p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Savings Rate</p>
          <p className={`text-2xl font-bold mt-1 ${savingsRate >= 0 ? "text-success" : "text-danger"}`}>
            {savingsRate.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Income vs Spending Chart */}
      <MonthlyChart data={monthlyData} />

      {/* Recurring & Subscriptions */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted">
            Recurring & Subscriptions
            <span className="ml-2 text-foreground font-semibold">{formatCurrency(recurringTotal)}/mo</span>
          </h3>
          <ResetBillsButton />
        </div>

        <BillSuggestions />

        {/* Bills grouped by status */}
        {(overdueBills.length > 0 || dueSoonBills.length > 0) && (
          <div className="space-y-3 mb-4">
            {overdueBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
            {dueSoonBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        )}

        {(upcomingBills.length > 0 || paidBills.length > 0) && (
          <details className="group mb-4">
            <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
              {upcomingBills.length + paidBills.length} more bills ({paidBills.length} paid)
            </summary>
            <div className="space-y-3 mt-3">
              {upcomingBills.map((bill) => (
                <BillCard key={bill.id} bill={bill} />
              ))}
              {paidBills.map((bill) => (
                <BillCard key={bill.id} bill={bill} />
              ))}
            </div>
          </details>
        )}

        <RecurringCharges charges={recurringList} />

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
            + Add bill
          </summary>
          <div className="mt-3">
            <AddBillForm />
          </div>
        </details>
      </div>

      {/* Spending by Category with Budget Progress */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted">Spending by Category</h3>
        </div>
        <div className="space-y-4">
          {categoryData.map((cat) => {
            const budget = budgetsWithSpending.find((b) => b.category === cat.category);
            return (
              <div key={cat.category}>
                <div className="flex flex-wrap items-center justify-between text-sm mb-1 gap-x-4 gap-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium truncate">{cat.label}</span>
                    {budget && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        budget.percentUsed >= 100 ? "bg-danger/10 text-danger"
                          : budget.percentUsed >= 80 ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                      }`}>
                        {budget.percentUsed.toFixed(0)}% of {formatCurrency(budget.limit)}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                </div>
                <div className="w-full bg-card-border rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      budget && budget.percentUsed >= 100 ? "bg-danger"
                        : budget && budget.percentUsed >= 80 ? "bg-warning"
                        : ""
                    }`}
                    style={{
                      width: budget
                        ? `${Math.min(100, budget.percentUsed)}%`
                        : `${cat.percent}%`,
                      backgroundColor: budget
                        ? undefined
                        : cat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {unbudgetedCategories.length > 0 && (
          <div className="mt-4 p-3 bg-warning/5 border border-warning/20 rounded-lg">
            <p className="text-xs text-warning">
              {unbudgetedCategories.length} categories without budgets
            </p>
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
            Manage budgets
          </summary>
          <div className="mt-3 space-y-3">
            <AddBudgetForm existingCategories={budgets.map((b) => b.category)} />
            {budgetsWithSpending.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span>{SPENDING_CATEGORY_LABELS[b.category] || b.category}: {formatCurrency(b.limit)}/mo</span>
                <DeleteBudgetButton id={b.id} category={b.category} />
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Transactions */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted mb-4">Transactions</h3>
        <TransactionTable
          accounts={accounts}
          categories={transactionCategories.map((c) => c.category)}
        />
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
            Manage category rules
          </summary>
          <div className="mt-3">
            <CategoryRulesManager />
          </div>
        </details>
      </div>
    </div>
  );
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

**Step 4: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/app/money-flow/
git commit -m "feat: add consolidated Money Flow page"
```

---

## Task 11: Advisor Page

Create the Advisor page with profile setup and recommendation display.

**Files:**
- Create: `personal-finance/src/app/advisor/page.tsx`
- Create: `personal-finance/src/app/advisor/ProfileForm.tsx`
- Create: `personal-finance/src/app/advisor/RecommendationCard.tsx`
- Create: `personal-finance/src/app/advisor/GenerateButton.tsx`

**Step 1: Create ProfileForm component**

Create `personal-finance/src/app/advisor/ProfileForm.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";

interface Profile {
  age: number;
  annualIncome: number;
  riskTolerance: string;
  filingStatus?: string | null;
  employmentType?: string | null;
  stateOfResidence?: string | null;
  employer401kMatch?: string | null;
  dependents?: number | null;
  isHomeowner?: boolean | null;
  monthlyTakeHome?: number | null;
}

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [form, setForm] = useState({
    age: "",
    annualIncome: "",
    riskTolerance: "MODERATE",
    filingStatus: "",
    employmentType: "",
    stateOfResidence: "",
    employer401kMatch: "",
    dependents: "",
    isHomeowner: "",
    monthlyTakeHome: "",
  });

  useEffect(() => {
    fetch("/finance/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.age) {
          setProfile(data);
          setForm({
            age: String(data.age),
            annualIncome: String(data.annualIncome),
            riskTolerance: data.riskTolerance,
            filingStatus: data.filingStatus || "",
            employmentType: data.employmentType || "",
            stateOfResidence: data.stateOfResidence || "",
            employer401kMatch: data.employer401kMatch || "",
            dependents: data.dependents != null ? String(data.dependents) : "",
            isHomeowner: data.isHomeowner != null ? String(data.isHomeowner) : "",
            monthlyTakeHome: data.monthlyTakeHome ? String(data.monthlyTakeHome) : "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body: Record<string, unknown> = {
      age: parseInt(form.age),
      annualIncome: parseFloat(form.annualIncome),
      riskTolerance: form.riskTolerance,
    };

    if (form.filingStatus) body.filingStatus = form.filingStatus;
    if (form.employmentType) body.employmentType = form.employmentType;
    if (form.stateOfResidence) body.stateOfResidence = form.stateOfResidence;
    if (form.employer401kMatch) body.employer401kMatch = form.employer401kMatch;
    if (form.dependents) body.dependents = parseInt(form.dependents);
    if (form.isHomeowner) body.isHomeowner = form.isHomeowner === "true";
    if (form.monthlyTakeHome) body.monthlyTakeHome = parseFloat(form.monthlyTakeHome);

    const res = await fetch("/finance/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setProfile(data);
    }

    setSaving(false);
  }

  if (loading) return <div className="text-muted text-sm">Loading profile...</div>;

  const inputClass = "w-full bg-transparent border border-card-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent";
  const selectClass = inputClass;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted font-medium mb-1 block">Age *</label>
          <input
            type="number"
            required
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className={inputClass}
            placeholder="30"
          />
        </div>
        <div>
          <label className="text-xs text-muted font-medium mb-1 block">Annual Income *</label>
          <input
            type="number"
            required
            value={form.annualIncome}
            onChange={(e) => setForm({ ...form, annualIncome: e.target.value })}
            className={inputClass}
            placeholder="75000"
          />
        </div>
        <div>
          <label className="text-xs text-muted font-medium mb-1 block">Risk Tolerance *</label>
          <select
            value={form.riskTolerance}
            onChange={(e) => setForm({ ...form, riskTolerance: e.target.value })}
            className={selectClass}
          >
            <option value="CONSERVATIVE">Conservative</option>
            <option value="MODERATE">Moderate</option>
            <option value="AGGRESSIVE">Aggressive</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="text-xs text-muted hover:text-foreground transition-colors"
      >
        {showOptional ? "Hide" : "Show"} optional fields (for better advice)
      </button>

      {showOptional && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Filing Status</label>
            <select
              value={form.filingStatus}
              onChange={(e) => setForm({ ...form, filingStatus: e.target.value })}
              className={selectClass}
            >
              <option value="">Not set</option>
              <option value="SINGLE">Single</option>
              <option value="MARRIED_FILING_JOINTLY">Married Filing Jointly</option>
              <option value="MARRIED_FILING_SEPARATELY">Married Filing Separately</option>
              <option value="HEAD_OF_HOUSEHOLD">Head of Household</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Employment Type</label>
            <select
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
              className={selectClass}
            >
              <option value="">Not set</option>
              <option value="W2">W-2 Employee</option>
              <option value="SELF_EMPLOYED_1099">Self-Employed (1099)</option>
              <option value="RETIRED">Retired</option>
              <option value="STUDENT">Student</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">State of Residence</label>
            <input
              value={form.stateOfResidence}
              onChange={(e) => setForm({ ...form, stateOfResidence: e.target.value })}
              className={inputClass}
              placeholder="e.g., CA, NY"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Monthly Take-Home Pay</label>
            <input
              type="number"
              value={form.monthlyTakeHome}
              onChange={(e) => setForm({ ...form, monthlyTakeHome: e.target.value })}
              className={inputClass}
              placeholder="5000"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Dependents</label>
            <input
              type="number"
              value={form.dependents}
              onChange={(e) => setForm({ ...form, dependents: e.target.value })}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Homeowner</label>
            <select
              value={form.isHomeowner}
              onChange={(e) => setForm({ ...form, isHomeowner: e.target.value })}
              className={selectClass}
            >
              <option value="">Not set</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !form.age || !form.annualIncome}
        className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving..." : profile ? "Update Profile" : "Save Profile"}
      </button>
    </form>
  );
}
```

**Step 2: Create RecommendationCard component**

Create `personal-finance/src/app/advisor/RecommendationCard.tsx`:

```tsx
"use client";

import { useState } from "react";

interface Recommendation {
  id: string;
  type: string;
  category: string;
  title: string;
  summary: string;
  details: string | null;
  priority: number;
}

export default function RecommendationCard({
  rec,
  onDismiss,
}: {
  rec: Recommendation;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    const res = await fetch(`/finance/api/advisor/${rec.id}`, { method: "PATCH" });
    if (res.ok) onDismiss(rec.id);
    setDismissing(false);
  }

  const priorityColor =
    rec.priority >= 8 ? "border-l-accent" :
    rec.priority >= 5 ? "border-l-warning" :
    "border-l-muted";

  return (
    <div className={`bg-card border border-card-border ${priorityColor} border-l-4 rounded-xl p-5 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{rec.title}</p>
          <p className="text-sm text-muted mt-1">{rec.summary}</p>
          {rec.details && expanded && (
            <p className="text-sm text-muted mt-2 whitespace-pre-line">{rec.details}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {rec.details && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-accent hover:underline"
            >
              {expanded ? "Less" : "More"}
            </button>
          )}
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="text-muted hover:text-foreground transition-colors"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-light text-muted">
          {rec.category}
        </span>
      </div>
    </div>
  );
}
```

**Step 3: Create GenerateButton component**

Create `personal-finance/src/app/advisor/GenerateButton.tsx`:

```tsx
"use client";

import { useState } from "react";

export default function GenerateButton({ onGenerated }: { onGenerated: () => void }) {
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/finance/api/advisor", { method: "POST" });
      if (res.ok) onGenerated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
    >
      {loading ? "Analyzing..." : "Generate Advice"}
    </button>
  );
}
```

**Step 4: Create Advisor page**

Create `personal-finance/src/app/advisor/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import AdvisorClient from "./AdvisorClient";

export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [profile, recommendations, creditScores] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: user.id } }),
    prisma.advisorRecommendation.findMany({
      where: { userId: user.id, isDismissed: false },
      orderBy: { priority: "desc" },
    }),
    prisma.creditScore.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  ]);

  return (
    <AdvisorClient
      hasProfile={!!profile}
      initialRecommendations={recommendations}
      creditScore={creditScores[0] || null}
      previousScore={creditScores[1] || null}
    />
  );
}
```

**Step 5: Create AdvisorClient wrapper**

Create `personal-finance/src/app/advisor/AdvisorClient.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import ProfileForm from "./ProfileForm";
import RecommendationCard from "./RecommendationCard";
import GenerateButton from "./GenerateButton";
import AddCreditScoreForm from "../insights/AddCreditScoreForm";

interface Recommendation {
  id: string;
  type: string;
  category: string;
  title: string;
  summary: string;
  details: string | null;
  priority: number;
}

interface CreditScoreData {
  score: number;
  source: string;
  createdAt: string;
}

function getCreditRating(score: number) {
  if (score >= 800) return { label: "Exceptional", color: "text-success" };
  if (score >= 740) return { label: "Very Good", color: "text-success" };
  if (score >= 670) return { label: "Good", color: "text-accent" };
  if (score >= 580) return { label: "Fair", color: "text-warning" };
  return { label: "Poor", color: "text-danger" };
}

export default function AdvisorClient({
  hasProfile,
  initialRecommendations,
  creditScore,
  previousScore,
}: {
  hasProfile: boolean;
  initialRecommendations: Recommendation[];
  creditScore: CreditScoreData | null;
  previousScore: CreditScoreData | null;
}) {
  const [recommendations, setRecommendations] = useState(initialRecommendations);

  const refresh = useCallback(() => {
    fetch("/finance/api/advisor")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecommendations(data);
      });
  }, []);

  function handleDismiss(id: string) {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  }

  // Split into top actions (priority >= 7) and rest
  const topActions = recommendations.filter((r) => r.priority >= 7).slice(0, 3);
  const otherRecs = recommendations.filter((r) => !topActions.includes(r));

  // Group others by category
  const groupedRecs = new Map<string, Recommendation[]>();
  for (const rec of otherRecs) {
    const group = groupedRecs.get(rec.category) || [];
    group.push(rec);
    groupedRecs.set(rec.category, group);
  }

  const scoreChange = creditScore && previousScore
    ? creditScore.score - previousScore.score
    : null;
  const rating = creditScore ? getCreditRating(creditScore.score) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Advisor</h2>
          <p className="text-muted text-sm mt-1">
            Boglehead-based financial recommendations
          </p>
        </div>
        {hasProfile && <GenerateButton onGenerated={refresh} />}
      </div>

      {/* Profile Setup */}
      <details open={!hasProfile} className="group">
        <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
          {hasProfile ? "Edit financial profile" : "Set up your financial profile to get started"}
        </summary>
        <div className="mt-3 bg-card border border-card-border rounded-xl p-6">
          <ProfileForm />
        </div>
      </details>

      {/* Top Actions */}
      {topActions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted">Top Actions</h3>
          {topActions.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} onDismiss={handleDismiss} />
          ))}
        </div>
      )}

      {/* Grouped Recommendations */}
      {Array.from(groupedRecs.entries()).map(([category, recs]) => (
        <details key={category} className="group">
          <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors flex items-center gap-2">
            {category}
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-light">
              {recs.length}
            </span>
          </summary>
          <div className="mt-3 space-y-3">
            {recs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} onDismiss={handleDismiss} />
            ))}
          </div>
        </details>
      ))}

      {hasProfile && recommendations.length === 0 && (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <p className="text-muted text-sm">
            No recommendations yet. Click &quot;Generate Advice&quot; to get personalized financial insights.
          </p>
        </div>
      )}

      {/* Credit Score */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted mb-4">Credit Score</h3>
        {creditScore ? (
          <div className="flex items-baseline gap-3 mb-4">
            <span className={`text-4xl font-bold ${rating?.color}`}>{creditScore.score}</span>
            <span className={`text-sm font-medium ${rating?.color}`}>{rating?.label}</span>
            {scoreChange !== null && scoreChange !== 0 && (
              <span className={`text-sm ${scoreChange > 0 ? "text-success" : "text-danger"}`}>
                {scoreChange > 0 ? "+" : ""}{scoreChange} pts
              </span>
            )}
          </div>
        ) : (
          <p className="text-muted text-sm mb-4">No credit score recorded yet.</p>
        )}
        <AddCreditScoreForm />
      </div>
    </div>
  );
}
```

**Step 6: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

**Step 7: Commit**

```bash
cd /Users/allen/whatisms
git add personal-finance/src/app/advisor/
git commit -m "feat: add Advisor page with profile, recommendations, and credit score"
```

---

## Task 12: Remove Old Pages

Delete the pages that have been consolidated into the new 4-tab structure.

**Files:**
- Delete: `personal-finance/src/app/breakdown/` (merged into Dashboard)
- Delete: `personal-finance/src/app/history/` (merged into Dashboard)
- Delete: `personal-finance/src/app/spending/` directory's `page.tsx` only — keep `SpendingChart.tsx`, `RecurringCharges.tsx`, `SyncTransactionsButton.tsx` as they're reused
- Delete: `personal-finance/src/app/budgets/` directory's `page.tsx` only — keep `AddBudgetForm.tsx`, `DeleteBudgetButton.tsx` as they're reused
- Delete: `personal-finance/src/app/bills/` directory's `page.tsx` only — keep `AddBillForm.tsx`, `BillCard.tsx`, `BillSuggestion.tsx`, `ResetBillsButton.tsx` as they're reused
- Delete: `personal-finance/src/app/transactions/` directory's `page.tsx` only — keep `TransactionTable.tsx`, `CategoryRulesManager.tsx` as they're reused
- Delete: `personal-finance/src/app/goals/` (entire directory, feature removed)
- Delete: `personal-finance/src/app/insights/` directory's `page.tsx`, `GenerateInsightsButton.tsx`, `InsightCard.tsx` — keep `AddCreditScoreForm.tsx` as it's reused

**Step 1: Delete consolidated pages**

```bash
cd /Users/allen/whatisms

# Pages fully merged into Dashboard
rm -rf personal-finance/src/app/breakdown/
rm -rf personal-finance/src/app/history/

# Goals removed entirely
rm -rf personal-finance/src/app/goals/

# Spending - keep reusable components, delete page
rm personal-finance/src/app/spending/page.tsx

# Budgets - keep reusable components, delete page
rm personal-finance/src/app/budgets/page.tsx

# Bills - keep reusable components, delete page
rm personal-finance/src/app/bills/page.tsx

# Transactions - keep reusable components, delete page
rm personal-finance/src/app/transactions/page.tsx

# Insights - keep AddCreditScoreForm, delete rest
rm personal-finance/src/app/insights/page.tsx
rm personal-finance/src/app/insights/GenerateInsightsButton.tsx
rm personal-finance/src/app/insights/InsightCard.tsx
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

Fix any import errors that arise. The most likely issue is that `SpendingChart.tsx` is imported from the spending page which we deleted — but it's also used by... actually wait, SpendingChart is NOT used by Money Flow since we use MonthlyChart instead. Check if any deleted component was the only consumer. The key reuse pattern:

- `Money Flow` imports from `../spending/RecurringCharges`, `../spending/SyncTransactionsButton`, `../bills/BillCard`, `../bills/AddBillForm`, `../bills/BillSuggestion`, `../bills/ResetBillsButton`, `../budgets/AddBudgetForm`, `../budgets/DeleteBudgetButton`, `../transactions/TransactionTable`, `../transactions/CategoryRulesManager`
- `Advisor` imports from `../insights/AddCreditScoreForm`

All of these files are kept. The deleted files (`page.tsx` files and a few others) are not imported by anything else.

**Step 3: Commit**

```bash
cd /Users/allen/whatisms
git add -A personal-finance/src/app/breakdown/ personal-finance/src/app/history/ personal-finance/src/app/goals/ personal-finance/src/app/spending/page.tsx personal-finance/src/app/budgets/page.tsx personal-finance/src/app/bills/page.tsx personal-finance/src/app/transactions/page.tsx personal-finance/src/app/insights/page.tsx personal-finance/src/app/insights/GenerateInsightsButton.tsx personal-finance/src/app/insights/InsightCard.tsx
git commit -m "feat: remove old pages consolidated into 4-tab navigation"
```

---

## Task 13: Build Verification

Verify the entire app builds successfully before deployment.

**Step 1: Type-check**

```bash
cd /Users/allen/whatisms/personal-finance && npx tsc --noEmit
```

Expected: No errors.

**Step 2: Build**

```bash
cd /Users/allen/whatisms/personal-finance && npm run build
```

Expected: Build succeeds with all new routes listed.

**Step 3: Fix any build errors**

If there are build errors, fix them one at a time. Common issues:
- Import paths for moved/deleted files
- Missing `"use client"` directives on components using hooks
- Unused imports from deleted pages

**Step 4: Commit any fixes**

```bash
cd /Users/allen/whatisms
git add personal-finance/
git commit -m "fix: resolve build issues from redesign"
```

---

## Task 14: Deploy and Verify

Push changes, deploy to production server, set up cron, and verify with Playwright.

**Step 1: Push to remote**

```bash
cd /Users/allen/whatisms && git push origin main
```

**Step 2: Generate CRON_SECRET and add to env**

```bash
CRON_SECRET=$(openssl rand -hex 32)
echo "CRON_SECRET=$CRON_SECRET" >> /Users/allen/whatisms/personal-finance/.env
```

**Step 3: Deploy to server**

```bash
ssh root@5.161.201.173 "cd /home/allen/whatisms && git pull origin main && docker compose build finance && docker compose up -d"
```

Wait for the build to complete and the container to be healthy.

**Step 4: Add CRON_SECRET to server env and restart**

```bash
CRON_SECRET=$(openssl rand -hex 32)
ssh root@5.161.201.173 "echo 'CRON_SECRET=$CRON_SECRET' >> /home/allen/whatisms/personal-finance/.env && cd /home/allen/whatisms && docker compose restart finance"
```

Wait for the container to be healthy again.

**Step 5: Push database schema changes**

```bash
ssh root@5.161.201.173 "cd /home/allen/whatisms && docker compose exec -T finance npx prisma db push"
```

**Step 6: Set up daily cron on server**

```bash
ssh root@5.161.201.173 "chmod +x /home/allen/whatisms/scripts/daily-snapshot.sh"
ssh root@5.161.201.173 "(crontab -l 2>/dev/null; echo '0 3 * * * /home/allen/whatisms/scripts/daily-snapshot.sh >> /var/log/snapshot-cron.log 2>&1') | crontab -"
```

**Step 7: Verify with Playwright**

Navigate to each tab and verify:

1. **Dashboard** (`whatisms.com/finance`) — Net worth card, allocation breakdown, history chart, account cards visible
2. **Accounts** (`whatisms.com/finance/accounts`) — Accounts listed, inline edit works on manual holdings
3. **Money Flow** (`whatisms.com/finance/money-flow`) — Summary cards, spending categories, bills section, transactions
4. **Advisor** (`whatisms.com/finance/advisor`) — Profile form visible, can save profile and generate recommendations
5. **Sidebar** — Only 4 tabs: Dashboard, Accounts, Money Flow, Advisor
6. **Portal link** — "Finance Tracker" title links back to `/`
7. **Old routes return 404** — `/finance/breakdown`, `/finance/history`, `/finance/goals`, `/finance/insights` should not load

**Step 8: Commit any deployment fixes**

If any issues found during verification, fix, rebuild, redeploy.
