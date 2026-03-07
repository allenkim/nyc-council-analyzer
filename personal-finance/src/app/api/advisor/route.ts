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
      const currentStockPct = (allocation.stocks / allocation.total) * 100;
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
        data: JSON.stringify({ cashValue }),
      });
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
