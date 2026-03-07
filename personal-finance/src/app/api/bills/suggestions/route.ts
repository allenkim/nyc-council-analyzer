import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const NON_BILL_CATEGORIES = new Set([
  "FOOD_AND_DRINK",
  "ENTERTAINMENT",
  "SHOPPING",
  "GENERAL_MERCHANDISE",
  "TRAVEL",
  "PERSONAL_CARE",
]);

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[*#]+/g, "")
    .replace(/\b(inc|llc|corp|ltd|co)\b\.?/gi, "")
    .replace(/\d+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  try {
    // Get recurring transactions
    const recurring = await prisma.transaction.findMany({
      where: { isRecurring: true, amount: { gt: 0 } },
      orderBy: { date: "desc" },
    });

    // Get existing bills for matching
    const bills = await prisma.bill.findMany();
    const billNames = bills.map((b) => normalizeName(b.name));

    // Group recurring by normalized merchant name
    const merchantGroups = new Map<string, typeof recurring>();
    for (const txn of recurring) {
      const key = normalizeName(txn.merchantName || txn.name);
      const group = merchantGroups.get(key) || [];
      group.push(txn);
      merchantGroups.set(key, group);
    }

    const suggestions: {
      merchantName: string;
      displayName: string;
      avgAmount: number;
      category: string;
      lastDate: string;
      transactionCount: number;
    }[] = [];

    for (const [normalizedName, group] of merchantGroups) {
      // Skip if category is non-bill
      if (NON_BILL_CATEGORIES.has(group[0].category)) continue;

      // Skip if already matched to a bill
      const matchedBill = billNames.some(
        (bn) => bn.includes(normalizedName) || normalizedName.includes(bn)
      );
      if (matchedBill) continue;

      // Check amount consistency (variance < 20%)
      const amounts = group.map((t) => t.amount);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const maxVariance = Math.max(...amounts.map((a) => Math.abs(a - avgAmount) / avgAmount));
      if (maxVariance > 0.2) continue;

      const displayName = group[0].merchantName || group[0].name;
      const lastDate = group.sort((a, b) => b.date.getTime() - a.date.getTime())[0].date;

      suggestions.push({
        merchantName: normalizedName,
        displayName,
        avgAmount: Math.round(avgAmount * 100) / 100,
        category: group[0].category,
        lastDate: lastDate.toISOString(),
        transactionCount: group.length,
      });
    }

    // Sort by amount descending
    suggestions.sort((a, b) => b.avgAmount - a.avgAmount);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error getting bill suggestions:", error);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
