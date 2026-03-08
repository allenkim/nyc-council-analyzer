// ── Fund Classification ─────────────────────────────────────────────────────
// Maps known tickers to their actual asset class, regardless of Plaid's
// security type (which conflates vehicle type with asset class).

type FundClass = "stocks" | "bonds" | "cash" | "target_date";
type FundSubclass =
  | "domestic" | "international" | "total_world"      // stocks
  | "muni" | "treasury" | "aggregate" | "tips" | "corporate" | "international_bond" // bonds
  | "money_market" | "savings"                         // cash
  | "target_date";                                     // target date

interface FundInfo {
  class: FundClass;
  subclass: FundSubclass;
  targetYear?: number; // for target_date funds
  taxNote?: string;    // tax-location guidance
}

export const FUND_CLASSIFICATION: Record<string, FundInfo> = {
  // ── Domestic Stock Funds ──
  VTI:   { class: "stocks", subclass: "domestic" },
  VTSAX: { class: "stocks", subclass: "domestic" },
  VTSMX: { class: "stocks", subclass: "domestic" },
  VOO:   { class: "stocks", subclass: "domestic" },
  VFIAX: { class: "stocks", subclass: "domestic" },
  VFINX: { class: "stocks", subclass: "domestic" },
  SPY:   { class: "stocks", subclass: "domestic" },
  IVV:   { class: "stocks", subclass: "domestic" },
  SCHB:  { class: "stocks", subclass: "domestic" },
  SWTSX: { class: "stocks", subclass: "domestic" },
  FSKAX: { class: "stocks", subclass: "domestic" },
  FXAIX: { class: "stocks", subclass: "domestic" },
  ITOT:  { class: "stocks", subclass: "domestic" },
  VXF:   { class: "stocks", subclass: "domestic" },  // extended market
  VEXAX: { class: "stocks", subclass: "domestic" },

  // ── International Stock Funds ──
  VXUS:  { class: "stocks", subclass: "international" },
  VTIAX: { class: "stocks", subclass: "international" },
  VGTSX: { class: "stocks", subclass: "international" },
  IXUS:  { class: "stocks", subclass: "international" },
  SCHF:  { class: "stocks", subclass: "international" },
  SWISX: { class: "stocks", subclass: "international" },
  FTIHX: { class: "stocks", subclass: "international" },
  VEA:   { class: "stocks", subclass: "international" },  // developed markets
  VWO:   { class: "stocks", subclass: "international" },  // emerging markets
  IEMG:  { class: "stocks", subclass: "international" },

  // ── Total World Stock Funds ──
  VT:    { class: "stocks", subclass: "total_world" },
  VTWAX: { class: "stocks", subclass: "total_world" },
  ACWI:  { class: "stocks", subclass: "total_world" },

  // ── US Aggregate Bond Funds ──
  BND:   { class: "bonds", subclass: "aggregate", taxNote: "Better in tax-advantaged accounts — interest is ordinary income" },
  VBTLX: { class: "bonds", subclass: "aggregate", taxNote: "Better in tax-advantaged accounts — interest is ordinary income" },
  VBMFX: { class: "bonds", subclass: "aggregate", taxNote: "Better in tax-advantaged accounts — interest is ordinary income" },
  AGG:   { class: "bonds", subclass: "aggregate", taxNote: "Better in tax-advantaged accounts — interest is ordinary income" },
  SCHZ:  { class: "bonds", subclass: "aggregate", taxNote: "Better in tax-advantaged accounts — interest is ordinary income" },
  FXNAX: { class: "bonds", subclass: "aggregate", taxNote: "Better in tax-advantaged accounts — interest is ordinary income" },

  // ── Treasury Bond Funds ──
  SGOV:  { class: "bonds", subclass: "treasury", taxNote: "State tax-exempt — OK in taxable, but interest is federally taxable" },
  SHV:   { class: "bonds", subclass: "treasury" },
  VGSH:  { class: "bonds", subclass: "treasury" },
  VGIT:  { class: "bonds", subclass: "treasury" },
  VGLT:  { class: "bonds", subclass: "treasury" },
  IEF:   { class: "bonds", subclass: "treasury" },
  TLT:   { class: "bonds", subclass: "treasury" },
  BIL:   { class: "bonds", subclass: "treasury" },
  GOVT:  { class: "bonds", subclass: "treasury" },

  // ── Municipal Bond Funds ──
  VNYUX: { class: "bonds", subclass: "muni", taxNote: "Tax-exempt interest — ideal in taxable brokerage" },
  VNYTX: { class: "bonds", subclass: "muni", taxNote: "Tax-exempt interest — ideal in taxable brokerage" },
  VTEB:  { class: "bonds", subclass: "muni", taxNote: "Tax-exempt interest — ideal in taxable brokerage" },
  MUB:   { class: "bonds", subclass: "muni", taxNote: "Tax-exempt interest — ideal in taxable brokerage" },
  VWALX: { class: "bonds", subclass: "muni", taxNote: "Tax-exempt interest — ideal in taxable brokerage" },
  VTEAX: { class: "bonds", subclass: "muni", taxNote: "Tax-exempt interest — ideal in taxable brokerage" },
  VWITX: { class: "bonds", subclass: "muni", taxNote: "Tax-exempt interest — ideal in taxable brokerage" },
  TFI:   { class: "bonds", subclass: "muni", taxNote: "Tax-exempt interest — ideal in taxable brokerage" },

  // ── TIPS ──
  VTIP:  { class: "bonds", subclass: "tips", taxNote: "Better in tax-advantaged — phantom income from inflation adjustment" },
  TIP:   { class: "bonds", subclass: "tips", taxNote: "Better in tax-advantaged — phantom income from inflation adjustment" },
  SCHP:  { class: "bonds", subclass: "tips" },

  // ── International Bond Funds ──
  BNDX:  { class: "bonds", subclass: "international_bond" },
  VTABX: { class: "bonds", subclass: "international_bond" },
  IAGG:  { class: "bonds", subclass: "international_bond" },

  // ── Corporate Bond Funds ──
  VCIT:  { class: "bonds", subclass: "corporate", taxNote: "Better in tax-advantaged accounts — interest is ordinary income" },
  LQD:   { class: "bonds", subclass: "corporate", taxNote: "Better in tax-advantaged accounts — interest is ordinary income" },
  VCLT:  { class: "bonds", subclass: "corporate", taxNote: "Better in tax-advantaged accounts — interest is ordinary income" },

  // ── Money Market / Cash ──
  VMFXX: { class: "cash", subclass: "money_market" },
  VMMXX: { class: "cash", subclass: "money_market" },
  SPAXX: { class: "cash", subclass: "money_market" },  // Fidelity
  FDRXX: { class: "cash", subclass: "money_market" },
  SWVXX: { class: "cash", subclass: "money_market" },  // Schwab

  // ── Vanguard Target Date Funds ──
  VFIFX: { class: "target_date", subclass: "target_date", targetYear: 2050 },
  VFFVX: { class: "target_date", subclass: "target_date", targetYear: 2055 },
  VTTSX: { class: "target_date", subclass: "target_date", targetYear: 2060 },
  VLXVX: { class: "target_date", subclass: "target_date", targetYear: 2065 },
  VTWNX: { class: "target_date", subclass: "target_date", targetYear: 2020 },
  VTTVX: { class: "target_date", subclass: "target_date", targetYear: 2025 },
  VTHRX: { class: "target_date", subclass: "target_date", targetYear: 2030 },
  VTTHX: { class: "target_date", subclass: "target_date", targetYear: 2035 },
  VFORX: { class: "target_date", subclass: "target_date", targetYear: 2040 },
  VTIVX: { class: "target_date", subclass: "target_date", targetYear: 2045 },

  // ── Fidelity Target Date (Freedom Index) ──
  FIPFX: { class: "target_date", subclass: "target_date", targetYear: 2050 },
  FDEWX: { class: "target_date", subclass: "target_date", targetYear: 2055 },
  FDKLX: { class: "target_date", subclass: "target_date", targetYear: 2060 },
  FFIJX: { class: "target_date", subclass: "target_date", targetYear: 2065 },
};

// ── Name-based heuristic for unknown tickers ────────────────────────────────

const TARGET_DATE_PATTERN = /target\s*(?:retirement\s*)?(\d{4})/i;
const BOND_NAME_PATTERNS = [
  /\bbond\b/i, /\btreasury\b/i, /\btax[- ]?exempt\b/i, /\btax[- ]?free\b/i,
  /\bmunicipal\b/i, /\bfixed income\b/i, /\bincome fund\b/i, /\btips\b/i,
  /\baggregate\b/i, /\bcorporate\b/i,
];
const INTL_NAME_PATTERNS = [/\binternational\b/i, /\btotal world\b/i, /\bglobal\b/i, /\bemerging\b/i];

export function classifyHolding(ticker: string | null, name: string, category: string): FundInfo | null {
  // 1. Check ticker lookup
  if (ticker && FUND_CLASSIFICATION[ticker.toUpperCase()]) {
    return FUND_CLASSIFICATION[ticker.toUpperCase()];
  }

  // 2. Check name patterns for target-date funds
  const targetMatch = name.match(TARGET_DATE_PATTERN);
  if (targetMatch) {
    return { class: "target_date", subclass: "target_date", targetYear: parseInt(targetMatch[1]) };
  }

  // 3. Check name patterns for bond funds
  if (BOND_NAME_PATTERNS.some((p) => p.test(name))) {
    const isMuni = /\bmunicipal\b/i.test(name) || /\btax[- ]?(?:exempt|free)\b/i.test(name);
    const isTreasury = /\btreasury\b/i.test(name);
    return {
      class: "bonds",
      subclass: isMuni ? "muni" : isTreasury ? "treasury" : "aggregate",
      taxNote: isMuni ? "Tax-exempt interest — ideal in taxable brokerage" : undefined,
    };
  }

  // 4. Fall back to category-based classification
  if (category === "BOND") return { class: "bonds", subclass: "aggregate" };
  if (category === "CASH") return { class: "cash", subclass: "money_market" };

  // ETFs and mutual funds without bond/target-date patterns → stocks
  if (category === "ETF" || category === "MUTUAL_FUND" || category === "STOCK") {
    const isIntl = INTL_NAME_PATTERNS.some((p) => p.test(name));
    return { class: "stocks", subclass: isIntl ? "international" : "domestic" };
  }

  return null; // CRYPTO, REAL_ESTATE, OTHER — not classified as investable
}

// ── Target Date Fund Split ──────────────────────────────────────────────────
// Estimate stock/bond ratio based on years until target

export function getTargetDateSplit(targetYear: number): { stockPct: number; bondPct: number } {
  const yearsOut = targetYear - new Date().getFullYear();
  // Near retirement: more bonds. Far out: more stocks. Cap at 10-90%.
  const stockPct = Math.min(90, Math.max(10, Math.round(yearsOut * 2.5)));
  return { stockPct, bondPct: 100 - stockPct };
}

// ── Boglehead Target Allocation ─────────────────────────────────────────────

export function getTargetAllocation(age: number, riskTolerance: string) {
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
  const domesticPercent = Math.round(stockPercent * 0.6);
  const internationalPercent = stockPercent - domesticPercent;

  return {
    bonds: bondPercent,
    domesticStocks: domesticPercent,
    internationalStocks: internationalPercent,
    total: 100,
  };
}

// ── Smart Allocation Calculation ────────────────────────────────────────────
// Uses fund classification to correctly categorize holdings.
// Excludes real estate and crypto from investable portfolio.

interface HoldingInput {
  name: string;
  ticker: string | null;
  category: string;
  value: number;
}

export interface AllocationResult {
  domesticStocks: number;
  internationalStocks: number;
  bonds: number;
  cash: number;
  // Not in investable portfolio
  crypto: number;
  realEstate: number;
  other: number;
  // Totals
  investableTotal: number;
  netWorthTotal: number;
  // Bond breakdown for tax-location advice
  muniBonds: number;
  taxableBonds: number;
}

export function categorizeAllocation(holdings: HoldingInput[]): AllocationResult {
  const result: AllocationResult = {
    domesticStocks: 0, internationalStocks: 0, bonds: 0, cash: 0,
    crypto: 0, realEstate: 0, other: 0,
    investableTotal: 0, netWorthTotal: 0,
    muniBonds: 0, taxableBonds: 0,
  };

  for (const h of holdings) {
    result.netWorthTotal += h.value;

    // Handle non-investable categories first
    if (h.category === "CRYPTO") { result.crypto += h.value; continue; }
    if (h.category === "REAL_ESTATE") { result.realEstate += h.value; continue; }

    const info = classifyHolding(h.ticker, h.name, h.category);

    if (!info) { result.other += h.value; continue; }

    if (info.class === "target_date") {
      // Split target-date fund into stocks and bonds
      const split = getTargetDateSplit(info.targetYear || 2060);
      const stockValue = h.value * (split.stockPct / 100);
      const bondValue = h.value * (split.bondPct / 100);
      // Assume target-date funds are ~60/40 domestic/international for the stock portion
      result.domesticStocks += stockValue * 0.6;
      result.internationalStocks += stockValue * 0.4;
      result.bonds += bondValue;
      result.taxableBonds += bondValue;
    } else if (info.class === "stocks") {
      if (info.subclass === "international" || info.subclass === "total_world") {
        result.internationalStocks += info.subclass === "total_world" ? h.value * 0.4 : h.value;
        if (info.subclass === "total_world") result.domesticStocks += h.value * 0.6;
      } else {
        result.domesticStocks += h.value;
      }
    } else if (info.class === "bonds") {
      result.bonds += h.value;
      if (info.subclass === "muni") {
        result.muniBonds += h.value;
      } else {
        result.taxableBonds += h.value;
      }
    } else if (info.class === "cash") {
      result.cash += h.value;
    }
  }

  result.investableTotal = result.domesticStocks + result.internationalStocks + result.bonds + result.cash;

  return result;
}

// ── Tax-Location Optimization ───────────────────────────────────────────────

export interface TaxLocationAdvice {
  fund: { ticker: string; name: string };
  preferredAccount: "taxable" | "tax-advantaged" | "either";
  reason: string;
}

export function getTaxLocationAdvice(
  fundTicker: string,
  fundName: string,
): TaxLocationAdvice["preferredAccount"] {
  const info = FUND_CLASSIFICATION[fundTicker.toUpperCase()];
  if (!info) return "either";

  if (info.subclass === "muni") return "taxable";
  if (info.subclass === "international") return "taxable"; // foreign tax credit
  if (info.subclass === "aggregate" || info.subclass === "corporate" || info.subclass === "tips") return "tax-advantaged";
  if (info.subclass === "treasury") return "either"; // state tax-exempt already

  // Stocks are fine either place, slight preference for taxable (LTCG rates)
  return "either";
}

const TAX_LOCATION_REASONS: Record<string, string> = {
  "taxable": "for the tax benefits (tax-exempt interest or foreign tax credit)",
  "tax-advantaged": "to shelter ordinary income from taxation",
  "either": "",
};

// ── Constants ───────────────────────────────────────────────────────────────

export const AVERAGE_MONTHLY_COSTS: Record<string, number> = {
  "phone": 55,
  "internet": 65,
  "streaming": 35,
  "insurance": 200,
  "utilities": 150,
  "gym": 40,
};

export const BOGLEHEAD_FUNDS = {
  domesticStocks: { ticker: "VTI", name: "Vanguard Total Stock Market ETF" },
  internationalStocks: { ticker: "VXUS", name: "Vanguard Total International Stock ETF" },
  bonds: { ticker: "BND", name: "Vanguard Total Bond Market ETF" },
  muniBonds: { ticker: "VTEB", name: "Vanguard Tax-Exempt Bond ETF" },
  total: { ticker: "VT", name: "Vanguard Total World Stock ETF" },
};

export const CONTRIBUTION_ORDER = [
  "Employer 401(k) match (free money)",
  "Pay off high-interest debt (>6% APR)",
  "Roth IRA ($7,000/year limit for 2024-2025)",
  "Max out 401(k) ($23,500/year limit for 2025)",
  "HSA if eligible ($4,300 single / $8,550 family for 2025)",
  "Taxable brokerage account",
];

export { TAX_LOCATION_REASONS };
