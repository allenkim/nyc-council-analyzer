# Finance Tracker Redesign — Design Document

## Goal

Consolidate the finance tracker from 10 sidebar tabs to 4, eliminate manual busywork, and add a Boglehead-based Advisor that gives actionable financial recommendations.

## Architecture

The redesign restructures the UI around 4 tabs (Dashboard, Accounts, Money Flow, Advisor), adds daily automatic snapshots via cron, auto-fetches crypto prices, enables inline editing for manual holdings, and introduces an AI-powered Advisor with progressive disclosure UX. The database schema gains a UserProfile model and an AdvisorRecommendation model. The Boglehead investing philosophy is the foundation for all investment advice.

## Tech Stack

Next.js 16, React 19, Prisma 7, LibSQL/SQLite, Tailwind v4, Recharts, Anthropic SDK (Claude), CoinGecko API (crypto prices), NextAuth v5.

---

## Navigation Consolidation

| Current (10 tabs) | New Home | Notes |
|---|---|---|
| Dashboard | **Dashboard** | Gains history chart + allocation breakdown |
| Accounts | **Accounts** | Gains inline holding editing + auto crypto prices |
| Breakdown | **Dashboard** | Merged into allocation section |
| Transactions | **Money Flow** | Searchable list within unified page |
| Spending | **Money Flow** | Monthly summary + category breakdown |
| Budgets | **Money Flow** | Inline budget bars per category |
| Bills | **Money Flow** | Recurring/subscriptions section |
| Goals | **Removed** | Advisor handles contextually |
| Insights | **Advisor** | AI insights + new recommendation engine |
| History | **Dashboard** | Net worth chart from auto-snapshots |

---

## Tab 1: Dashboard

The current-state overview. Read-only, no manual input required.

### Components

- **Net worth card**: Total net worth with trend indicator (dollar and percent change from last month). Privacy toggle (existing) hides values.
- **Net worth history chart**: Line chart from daily auto-snapshots. Toggle: 1M, 3M, 6M, 1Y, All. Linear regression projection line (existing feature carried over). Replaces the manual History page entirely.
- **Asset allocation chart**: Donut/pie chart with category breakdown table below. Merges the current Breakdown page. Categories: Stocks, Bonds, Cash, Crypto, Real Estate, ETFs, Mutual Funds, Other.
- **Cash flow forecast**: Existing 90-day projection (income - bills - recurring = projected balance).
- **Account cards**: Sorted by value descending. Zero-balance accounts collapsed (existing behavior).

### Data sources

All data is read from existing models (Account, Holding, Snapshot). No new APIs needed beyond the snapshot cron.

---

## Tab 2: Accounts

Manage connections and holdings. Primary place for manual input.

### Existing (no changes)

- Plaid Link and SnapTrade Link buttons for connecting bank/brokerage accounts
- Sync buttons with last-sync timestamps
- Account list with holdings tables
- Add manual account form
- Add holding form (for manual accounts)
- Cost basis tracking (add purchase history entries)
- Delete account/holding

### New: Inline holding editing

For manual holdings (not Plaid/SnapTrade synced):
- Click price or quantity cell in the holdings table to edit in-place
- Save on blur or Enter key
- Cancel on Escape
- Visual indicator (pencil icon or subtle border) showing editable fields
- Only price and quantity are inline-editable; other fields (name, category, ticker) use the existing form or a simple modal

### New: Auto crypto prices

- Holdings with category=CRYPTO and a recognized ticker (BTC, ETH, SOL, etc.) auto-fetch current price from CoinGecko free API
- Price updates on page load and on manual sync
- Last-updated timestamp shown next to price
- Manual override: user can still edit price inline (overrides auto-price until next sync)
- API endpoint: `GET /api/crypto-prices?tickers=BTC,ETH` — server-side fetch to avoid CORS/rate-limit issues
- Mapping table: common crypto ticker to CoinGecko ID (bitcoin, ethereum, solana, etc.)

---

## Tab 3: Money Flow

Consolidated view replacing Transactions, Spending, Budgets, and Bills pages. Summary-first layout.

### Section 1: Monthly summary cards (top row)

- Income this month (sum of negative-amount transactions)
- Spending this month (sum of positive-amount transactions)
- Net savings (income - spending)
- Savings rate % (net savings / income)

### Section 2: Income vs Spending chart

- Bar chart showing last 6 months side by side
- Each month: green bar (income), red bar (spending)
- Net savings line overlay optional

### Section 3: Recurring and Subscriptions

- Auto-detected recurring charges (existing isRecurring flag from Plaid + pattern detection)
- Manually added bills (existing Bill model)
- Display: name, amount, frequency, next due date, status (paid/due soon/overdue/upcoming)
- Total monthly recurring cost at top
- Add bill form (simplified — name, amount, due day, category)
- Toggle paid status per bill
- Monthly reset for paid status (existing)

### Section 4: Spending by Category

- Category breakdown with horizontal bar chart or progress bars
- Each category shows: spent this month, budget limit (if set), progress bar
- Over-budget categories highlighted in red
- Under-budget in green
- Unbudgeted categories called out with "Set budget" link
- Click a category to: set/adjust budget limit, view transactions in that category
- Month-over-month percent change per category (existing feature)

### Section 5: Transactions

- Searchable, filterable transaction list (existing functionality moved here)
- Filters: date range, category, account, amount range, search text
- Category rules auto-apply (existing)
- Delete transaction (existing)

---

## Tab 4: Advisor

AI-powered financial recommendations based on Boglehead philosophy. Progressive disclosure UX to avoid overwhelming the user.

### UX Structure

**Top: 1-3 "Top Actions"**
- Highest-impact recommendations surfaced as short, actionable cards
- Each card: one-sentence summary + optional "Learn more" expand + optional CTA
- Example: "Max your Roth IRA — you're $4k below the annual limit." [Learn more]
- AI ranks by estimated financial impact (tax savings, fee reduction, expected return improvement)

**Middle: Collapsible sections by category**
- Each section collapsed by default with count badge: "Allocation (2 suggestions)"
- Categories:
  - Account Structure
  - Asset Allocation
  - Cost Savings
  - Spending Trends
- User opens sections they're interested in

**Bottom: Profile settings**
- Tucked behind a settings/gear icon or at bottom of page
- Not prominent after initial setup

**Interaction:**
- Dismiss/snooze recommendations (don't reappear until conditions change)
- "Generate new advice" button to refresh recommendations
- Recommendations auto-refresh on significant events (new account connected, monthly rollover, large balance change)

### User Profile

Stored in new UserProfile model, one per user.

**Required fields (minimal onboarding):**
- Age (number)
- Annual income (number)
- Risk tolerance (enum: CONSERVATIVE, MODERATE, AGGRESSIVE)

**Optional fields (fill in anytime for better advice):**
- Filing status (SINGLE, MARRIED_FILING_JOINTLY, MARRIED_FILING_SEPARATELY, HEAD_OF_HOUSEHOLD)
- Employment type (W2, SELF_EMPLOYED_1099, RETIRED, STUDENT, OTHER)
- State of residence (for state tax context)
- Employer 401k match (percentage and cap, e.g., "100% up to 6%")
- Number of dependents
- Homeowner status (boolean)
- Monthly take-home pay (if different from annual/12)

### Recommendation Types

**1. Account Structure**
- Flag large savings balances without tax-advantaged accounts connected
- "You have $40k in savings. Consider maxing your Roth IRA ($7k/yr limit) — tax-free growth."
- "No 401k connected. Does your employer offer one? Especially if they match contributions."
- Suggest contribution order: employer 401k match > Roth IRA > remaining 401k > taxable brokerage
- Based on Boglehead priority: tax-advantaged space first

**2. Asset Allocation**
- Calculate current allocation across all accounts
- Compare to Boglehead age-based target: bonds % roughly equals age (or age-20 for more aggressive)
- Visual: current allocation pie vs target allocation pie, side by side
- Specific rebalancing suggestions: "Move $X from bonds to international stocks"
- Factor in risk tolerance from profile

**3. What to Buy Next**
- Identify largest gap between current and target allocation
- "You're underweight international stocks (8% vs target 20%). With your next $1,000, consider VXUS."
- Suggest specific low-cost index funds (Boglehead-approved): VTI, VXUS, BND, VT, etc.
- Consider which account to buy in (tax-location optimization): bonds in tax-advantaged, stocks in taxable

**4. Cost Optimization**
- Compare recurring bills against typical consumer averages by category
- Averages sourced from public data (BLS Consumer Expenditure Survey or similar)
- Adjust comparisons based on demographic profile if provided (state, household size)
- "Your phone bill ($85/mo) is above average ($55/mo). Consider switching plans."
- "Your streaming subscriptions total $65/mo across 4 services."
- Flag any unusually large one-time charges

**5. Spending Insights (carried over from current Insights page)**
- Spending anomaly detection (existing)
- Weekly/monthly trend summaries
- Budget overage alerts
- Recurring charge detection
- Credit score tracking (manual entry, existing)

### AI Implementation

- Uses existing Anthropic SDK integration
- Prompt includes: user profile, all account balances, allocation breakdown, recent spending, recurring charges, connected vs missing account types
- Generates structured JSON recommendations with priority scores
- Stored in new AdvisorRecommendation model (replaces current Insight model or extends it)
- Fields: type, title, summary, details, priority (1-10), isDismissed, dismissedAt, category

---

## Automatic Daily Snapshots

### Implementation

- Server-side cron job runs daily (e.g., 3 AM)
- Calls existing snapshot creation logic: records net worth + holdings breakdown
- Implementation options:
  - External cron (system crontab or launchd on server) hitting `POST /api/snapshots`
  - Or: Next.js API route with a cron trigger (Vercel-style, but we're self-hosted)
  - Simplest: Docker healthcheck-adjacent cron via `docker compose exec` or a small sidecar script
- Deduplication: skip if snapshot already exists for today
- Existing manual snapshots preserved in the same table

### History chart

- Dashboard reads from Snapshot model (no changes to data model)
- More data points = smoother chart (daily vs sporadic manual)

---

## Database Changes

### New Models

```prisma
model UserProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Required
  age             Int
  annualIncome    Float
  riskTolerance   String   // CONSERVATIVE, MODERATE, AGGRESSIVE

  // Optional
  filingStatus    String?  // SINGLE, MARRIED_FILING_JOINTLY, etc.
  employmentType  String?  // W2, SELF_EMPLOYED_1099, RETIRED, etc.
  stateOfResidence String?
  employer401kMatch String? // JSON: { "matchPercent": 100, "upToPercent": 6 }
  dependents      Int?
  isHomeowner     Boolean?
  monthlyTakeHome Float?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model AdvisorRecommendation {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        String   // ACCOUNT_STRUCTURE, ALLOCATION, COST_OPTIMIZATION, SPENDING, WHAT_TO_BUY
  category    String   // For grouping in UI
  title       String
  summary     String
  details     String?  // Longer explanation for "Learn more"
  priority    Int      // 1-10, higher = more impactful
  isDismissed Boolean  @default(false)
  dismissedAt DateTime?
  data        String?  // JSON for structured data (e.g., specific fund suggestions)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, isDismissed])
}
```

### Modified Models

- User: add relation to UserProfile and AdvisorRecommendation
- Insight model: kept for backward compatibility or migrated to AdvisorRecommendation

### Removed Features

- FinancialGoal model: can be dropped (or kept in schema but UI removed)
- Manual snapshot button: removed from UI (cron handles it)

---

## New API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/profile` | GET, PUT | Get/update user profile |
| `/api/advisor` | GET | Get current recommendations (non-dismissed) |
| `/api/advisor` | POST | Generate new recommendations via AI |
| `/api/advisor/[id]` | PATCH | Dismiss/snooze a recommendation |
| `/api/crypto-prices` | GET | Fetch current prices for crypto tickers |
| `/api/snapshots/auto` | POST | Cron-triggered daily snapshot (with auth token) |

---

## What Gets Removed

| Feature | Reason |
|---|---|
| Goals page + FinancialGoal UI | Advisor handles contextually |
| History page | Merged into Dashboard |
| Breakdown page | Merged into Dashboard |
| Insights page | Merged into Advisor |
| Manual "Take Snapshot" button | Replaced by daily cron |
| Standalone Budgets page | Inline in Money Flow |
| Standalone Bills page | Recurring section in Money Flow |
| Standalone Spending page | Summary section in Money Flow |

---

## Migration Path

1. Build new pages alongside existing ones (new routes)
2. Update sidebar to 4-tab navigation
3. Migrate existing Insight data to AdvisorRecommendation if schema changes
4. Preserve all existing API endpoints that are still used
5. Remove old page components after new pages are verified
6. Deploy and verify with Playwright
