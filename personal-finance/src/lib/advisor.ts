// Boglehead-inspired target allocation based on age and risk tolerance
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
  "phone": 55,
  "internet": 65,
  "streaming": 35,
  "insurance": 200,
  "utilities": 150,
  "gym": 40,
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
