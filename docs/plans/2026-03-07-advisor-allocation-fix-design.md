# Advisor Allocation Fix — Design Document

## Goal

Fix the advisor's allocation analysis to correctly classify holdings, calculate allocation on investable portfolio only, and provide tax-location-aware recommendations.

## Problems

1. `categorizeAllocation()` treats all ETFs and mutual funds as "stocks" — bond funds (VNYUX, SGOV) and target-date funds (VTTSX) are miscounted
2. No tax-location awareness — recommends BND in taxable when user already has VNYUX (muni bonds, better in taxable)
3. Real estate ($465k condo) in denominator skews all allocation percentages
4. "What to buy next" is generic — doesn't consider what user already owns or which account to buy in
5. Account structure recommendations don't check what accounts user already has connected

## Design

### 1. Fund Classification (ticker lookup + name heuristic)

Add `FUND_CLASSIFICATION` map for ~50-80 common tickers mapping to `{ class, subclass }`. Classes: `stocks`, `bonds`, `cash`, `target_date`. Subclasses: `domestic`, `international`, `total_world`, `muni`, `treasury`, `aggregate`, etc.

For target-date funds, estimate stock/bond split: `stockPct = min(90, max(20, (targetYear - currentYear) * 2))`.

For unknown tickers, pattern-match on holding name: "Bond", "Treasury", "Tax Exempt" → bonds. "Target 20XX" → target date. Fallback to current category logic.

### 2. Investable Portfolio Allocation

Exclude REAL_ESTATE and CRYPTO from allocation calculation. New return: `domesticStocks`, `internationalStocks`, `bonds`, `cash`, `investableTotal`, plus `realEstate`, `crypto`, `netWorthTotal` tracked separately.

### 3. Tax-Location Aware Recommendations

| Fund Type | Best Account | Why |
|-----------|-------------|-----|
| Municipal bonds | Taxable brokerage | Tax-exempt interest wasted in tax-advantaged |
| Taxable bonds (BND) | Tax-advantaged (IRA/401k) | Interest is ordinary income |
| International stocks (VXUS) | Taxable brokerage | Foreign tax credit |
| Domestic stocks | Either | Long-term cap gains favorable in taxable |

Recommendations say both *what* and *where*.

### 4. Smarter Account Structure Recommendations

Check what accounts user actually has connected before suggesting they open one. Don't recommend "consider Roth IRA" if they already have one connected.

## Files Changed

- `personal-finance/src/lib/advisor.ts` — Fund classification, new allocation logic, tax-location helpers
- `personal-finance/src/app/api/advisor/route.ts` — Updated recommendation generation using new logic
