import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  getTargetAllocation,
  categorizeAllocation,
  classifyHolding,
  getTaxLocationAdvice,
  AVERAGE_MONTHLY_COSTS,
  BOGLEHEAD_FUNDS,
  CONTRIBUTION_ORDER,
  TAX_LOCATION_REASONS,
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

    // Gather financial data — include account info for holdings
    const [accounts, holdings, bills, transactions] = await Promise.all([
      prisma.account.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, type: true, institution: true },
      }),
      prisma.holding.findMany({
        where: { account: { userId: user.id } },
        select: {
          category: true, value: true, name: true, ticker: true,
          account: { select: { name: true, type: true, institution: true } },
        },
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

    // --- 1. Asset Allocation Analysis (investable portfolio only) ---
    const allocation = categorizeAllocation(holdings);
    const target = getTargetAllocation(profile.age, profile.riskTolerance);
    const inv = allocation.investableTotal;

    if (inv > 0) {
      const currentDomesticPct = (allocation.domesticStocks / inv) * 100;
      const currentIntlPct = (allocation.internationalStocks / inv) * 100;
      const currentStockPct = currentDomesticPct + currentIntlPct;
      const currentBondPct = (allocation.bonds / inv) * 100;
      const currentCashPct = (allocation.cash / inv) * 100;
      const targetStockPct = target.domesticStocks + target.internationalStocks;

      // Allocation imbalance check
      if (Math.abs(currentStockPct - targetStockPct) > 10) {
        const direction = currentStockPct > targetStockPct ? "overweight stocks" : "underweight stocks";
        recommendations.push({
          type: "ALLOCATION",
          category: "Asset Allocation",
          title: `You're ${direction} in your investable portfolio`,
          summary: `At age ${profile.age} with ${profile.riskTolerance.toLowerCase()} risk tolerance, Bogleheads suggest ~${targetStockPct}% stocks / ~${target.bonds}% bonds. Your investable portfolio is ${currentStockPct.toFixed(0)}% stocks / ${currentBondPct.toFixed(0)}% bonds / ${currentCashPct.toFixed(0)}% cash.`,
          details: `This analysis covers your investable portfolio ($${Math.round(inv).toLocaleString()}) — excluding real estate ($${Math.round(allocation.realEstate).toLocaleString()}) and crypto ($${Math.round(allocation.crypto).toLocaleString()}) which are tracked separately.\n\nConsider rebalancing gradually through new contributions rather than selling existing positions to avoid tax events.`,
          priority: 8,
          data: JSON.stringify({
            current: { stocks: currentStockPct, bonds: currentBondPct, cash: currentCashPct },
            target,
            investableTotal: inv,
          }),
        });
      }

      // Domestic vs international stock balance
      const totalStocks = allocation.domesticStocks + allocation.internationalStocks;
      if (totalStocks > 0) {
        const intlRatio = (allocation.internationalStocks / totalStocks) * 100;
        if (intlRatio < 25 && totalStocks > 10000) {
          recommendations.push({
            type: "ALLOCATION",
            category: "Asset Allocation",
            title: "Consider more international diversification",
            summary: `Your stock allocation is ${intlRatio.toFixed(0)}% international — Bogleheads typically recommend 30-40%. International stocks provide diversification and access to the foreign tax credit in taxable accounts.`,
            details: `Consider ${BOGLEHEAD_FUNDS.internationalStocks.name} (${BOGLEHEAD_FUNDS.internationalStocks.ticker}) in your taxable brokerage to capture the foreign tax credit.`,
            priority: 6,
            data: null,
          });
        }
      }

      // --- What to buy next (tax-location aware) ---
      const stockGap = targetStockPct - currentStockPct;
      const bondGap = target.bonds - currentBondPct;

      // Build existing fund set to avoid recommending what user already owns
      const ownedTickers = new Set(holdings.map((h) => h.ticker?.toUpperCase()).filter(Boolean));

      if (Math.abs(stockGap) > 5 || Math.abs(bondGap) > 5) {
        const largestGap = Math.abs(stockGap) > Math.abs(bondGap) ? "stocks" : "bonds";
        const gapPct = Math.abs(largestGap === "stocks" ? stockGap : bondGap);

        if (largestGap === "bonds") {
          // Check if user has tax-advantaged accounts for regular bonds
          const hasIRA = accounts.some((a) => a.name.toLowerCase().includes("ira"));
          const has401k = accounts.some((a) => a.name.toLowerCase().includes("401k") || a.institution?.toLowerCase().includes("fidelity"));
          const hasTaxable = accounts.some((a) => a.type === "BROKERAGE" && !a.name.toLowerCase().includes("ira") && !a.name.toLowerCase().includes("401k"));

          if (hasTaxable && !ownedTickers.has("VTEB") && !ownedTickers.has("MUB")) {
            // Suggest muni bonds for taxable
            recommendations.push({
              type: "WHAT_TO_BUY",
              category: "Asset Allocation",
              title: `Next purchase: consider muni bonds in your taxable account`,
              summary: `You're ${gapPct.toFixed(0)}% underweight in bonds. For your taxable brokerage, municipal bond funds like ${BOGLEHEAD_FUNDS.muniBonds.name} (${BOGLEHEAD_FUNDS.muniBonds.ticker}) provide tax-exempt interest.`,
              details: `Municipal bonds are ideal in taxable accounts because the interest is exempt from federal (and often state) income tax. You already hold VNYUX — this would add to your tax-efficient bond allocation.\n\nFor tax-advantaged accounts (IRA, 401k), regular bond funds like BND are fine since the tax treatment doesn't matter there.`,
              priority: 7,
              data: JSON.stringify({ gap: bondGap, suggestion: "muni_bonds_taxable" }),
            });
          } else if (hasIRA || has401k) {
            recommendations.push({
              type: "WHAT_TO_BUY",
              category: "Asset Allocation",
              title: `Next purchase: consider bonds in your ${hasIRA ? "IRA" : "401k"}`,
              summary: `You're ${gapPct.toFixed(0)}% underweight in bonds. For your ${hasIRA ? "IRA" : "401k"}, consider ${BOGLEHEAD_FUNDS.bonds.name} (${BOGLEHEAD_FUNDS.bonds.ticker}) — regular bond interest is best sheltered in tax-advantaged accounts.`,
              details: `Bond interest is taxed as ordinary income, so holding bonds in tax-advantaged accounts (IRA, 401k) is more tax-efficient than in a taxable brokerage.`,
              priority: 7,
              data: JSON.stringify({ gap: bondGap, suggestion: "bonds_tax_advantaged" }),
            });
          } else {
            // No IRA/401k — just suggest bonds generally
            recommendations.push({
              type: "WHAT_TO_BUY",
              category: "Asset Allocation",
              title: `Next purchase: consider adding bonds`,
              summary: `You're ${gapPct.toFixed(0)}% underweight in bonds. Consider ${BOGLEHEAD_FUNDS.bonds.name} (${BOGLEHEAD_FUNDS.bonds.ticker}) for broad bond exposure.`,
              details: null,
              priority: 7,
              data: JSON.stringify({ gap: bondGap }),
            });
          }
        } else {
          // Underweight stocks — check domestic vs international gap
          const domesticGap = target.domesticStocks - currentDomesticPct;
          const intlGap = target.internationalStocks - currentIntlPct;
          const worstStockGap = Math.abs(domesticGap) > Math.abs(intlGap) ? "domestic" : "international";

          const fund = worstStockGap === "domestic"
            ? BOGLEHEAD_FUNDS.domesticStocks
            : BOGLEHEAD_FUNDS.internationalStocks;

          const locationPref = getTaxLocationAdvice(fund.ticker, fund.name);
          const locationNote = locationPref !== "either"
            ? ` Consider buying in your ${locationPref === "taxable" ? "taxable brokerage" : "IRA or 401k"} ${TAX_LOCATION_REASONS[locationPref]}.`
            : "";

          recommendations.push({
            type: "WHAT_TO_BUY",
            category: "Asset Allocation",
            title: `Next purchase: consider ${fund.ticker}`,
            summary: `You're ${gapPct.toFixed(0)}% underweight in stocks (especially ${worstStockGap}).${locationNote}`,
            details: `${fund.name} is a low-cost, broadly diversified index fund — a Boglehead staple. Expense ratio is among the lowest in the industry.`,
            priority: 7,
            data: JSON.stringify({ fund, gap: stockGap, worstGap: worstStockGap }),
          });
        }
      }
    }

    // --- 2. Account Structure Analysis (smarter) ---
    const accountNames = accounts.map((a) => a.name.toLowerCase());
    const accountInstitutions = accounts.map((a) => (a.institution || "").toLowerCase());
    const hasIRA = accountNames.some((n) => n.includes("ira"));
    const has401k = accountNames.some((n) => n.includes("401k")) ||
                    accountInstitutions.some((n) => n.includes("fidelity") && !accountNames.some((an) => an.includes("ira")));
    const hasBrokerage = accounts.some((a) => a.type === "BROKERAGE");
    const cashValue = allocation.cash;

    // Only recommend opening accounts the user doesn't have
    if (cashValue > 10000 && !hasBrokerage) {
      recommendations.push({
        type: "ACCOUNT_STRUCTURE",
        category: "Account Structure",
        title: "Consider opening a brokerage account",
        summary: `You have $${Math.round(cashValue).toLocaleString()} in cash. A brokerage account would let you invest in low-cost index funds for long-term growth.`,
        details: CONTRIBUTION_ORDER.map((s, i) => `${i + 1}. ${s}`).join("\n"),
        priority: 9,
        data: null,
      });
    }

    if (cashValue > 25000) {
      // Build specific advice based on what accounts are missing
      const missingAccounts: string[] = [];
      if (!hasIRA) missingAccounts.push("Roth IRA ($7,000/yr limit)");
      if (!has401k) missingAccounts.push("401(k) — check if your employer offers one");

      if (missingAccounts.length > 0) {
        recommendations.push({
          type: "ACCOUNT_STRUCTURE",
          category: "Account Structure",
          title: "Consider tax-advantaged accounts",
          summary: `You have $${Math.round(cashValue).toLocaleString()} in cash but no ${missingAccounts.join(" or ")} connected. Tax-advantaged accounts should be funded before excess cash sits idle.`,
          details: `Boglehead contribution priority:\n${CONTRIBUTION_ORDER.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nCash beyond 3-6 months of expenses is typically better deployed in investments.`,
          priority: 9,
          data: JSON.stringify({ cashValue, missingAccounts }),
        });
      } else if (cashValue > 50000) {
        // User has all account types but still lots of cash
        recommendations.push({
          type: "ACCOUNT_STRUCTURE",
          category: "Account Structure",
          title: "Large cash position",
          summary: `You have $${Math.round(cashValue).toLocaleString()} in cash. If this exceeds your 3-6 month emergency fund, consider deploying the excess into your existing investment accounts.`,
          details: null,
          priority: 6,
          data: JSON.stringify({ cashValue }),
        });
      }
    }

    // --- 3. Cost Optimization ---
    for (const bill of bills) {
      const normalizedName = bill.name.toLowerCase();
      for (const [costCategory, avgCost] of Object.entries(AVERAGE_MONTHLY_COSTS)) {
        if (normalizedName.includes(costCategory) && bill.amount > avgCost * 1.3) {
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

    // --- 4. AI-powered spending analysis (with corrected allocation data) ---
    if (process.env.ANTHROPIC_API_KEY && transactions.length > 0) {
      try {
        const spendingData = Object.fromEntries(
          transactions.map((t) => [t.category, ((t._sum.amount || 0) / 3).toFixed(2)])
        );

        const inv = allocation.investableTotal;
        const stockPct = inv > 0 ? (((allocation.domesticStocks + allocation.internationalStocks) / inv) * 100).toFixed(0) : "0";
        const bondPct = inv > 0 ? ((allocation.bonds / inv) * 100).toFixed(0) : "0";
        const cashPct = inv > 0 ? ((allocation.cash / inv) * 100).toFixed(0) : "0";

        // Build holding summary for AI
        const holdingSummary = holdings
          .filter((h) => h.value > 1000)
          .map((h) => `${h.name}${h.ticker ? ` (${h.ticker})` : ""}: $${Math.round(h.value).toLocaleString()} in ${h.account.name}`)
          .join("\n");

        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `You are a Boglehead-philosophy personal finance advisor. Analyze this user's spending and portfolio, and provide 2-3 specific, actionable recommendations. Be direct and mention dollar amounts.

User profile: Age ${profile.age}, income $${profile.annualIncome.toLocaleString()}/yr, risk tolerance: ${profile.riskTolerance}

Average monthly spending by category (last 3 months):
${JSON.stringify(spendingData, null, 2)}

Monthly bills: ${bills.map((b) => `${b.name}: $${b.amount}`).join(", ") || "none tracked"}

Investable portfolio: $${Math.round(inv).toLocaleString()} (Stocks: ${stockPct}%, Bonds: ${bondPct}%, Cash: ${cashPct}%)
Also: Real estate $${Math.round(allocation.realEstate).toLocaleString()}, Crypto $${Math.round(allocation.crypto).toLocaleString()}

Key holdings:
${holdingSummary}

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

    // Return allocation summary alongside recommendations
    const invTotal = allocation.investableTotal;
    const allocationSummary = invTotal > 0 ? {
      current: {
        domesticStocks: (allocation.domesticStocks / invTotal) * 100,
        internationalStocks: (allocation.internationalStocks / invTotal) * 100,
        bonds: (allocation.bonds / invTotal) * 100,
        cash: (allocation.cash / invTotal) * 100,
      },
      target,
      investableTotal: invTotal,
      realEstate: allocation.realEstate,
      crypto: allocation.crypto,
    } : null;

    return NextResponse.json({ generated: recommendations.length, recommendations: saved, allocation: allocationSummary });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
