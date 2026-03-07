import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, format } from "date-fns";
import { getUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const days = 90;

    // Starting balance: sum of all BANK account Cash holdings
    const bankAccounts = await prisma.account.findMany({
      where: { type: "BANK", userId: user.id },
      include: {
        holdings: { where: { category: "CASH" } },
      },
    });

    const startingBalance = bankAccounts.reduce(
      (sum, a) => sum + a.holdings.reduce((s, h) => s + h.value, 0),
      0
    );

    // Get bills for expected outflows
    const bills = await prisma.bill.findMany({ where: { userId: user.id } });

    // Get recurring spending transactions for additional outflows
    const recurringSpending = await prisma.transaction.findMany({
      where: { account: { userId: user.id }, isRecurring: true, amount: { gt: 0 } },
      orderBy: { date: "desc" },
    });

    // Get recurring income (negative amount = money in)
    const recurringIncome = await prisma.transaction.findMany({
      where: { account: { userId: user.id }, isRecurring: true, amount: { lt: 0 } },
      orderBy: { date: "desc" },
    });

    // Group recurring by merchant, take latest for interval estimation
    function getRecurringEvents(
      transactions: typeof recurringSpending
    ): { name: string; amount: number; dayOfMonth: number }[] {
      const groups = new Map<string, typeof recurringSpending>();
      for (const txn of transactions) {
        const key = (txn.merchantName || txn.name).toLowerCase();
        const group = groups.get(key) || [];
        group.push(txn);
        groups.set(key, group);
      }

      const events: { name: string; amount: number; dayOfMonth: number }[] = [];
      for (const [, group] of groups) {
        const latest = group[0]; // Already sorted desc
        events.push({
          name: latest.merchantName || latest.name,
          amount: latest.amount,
          dayOfMonth: latest.date.getDate(),
        });
      }
      return events;
    }

    const recurringOutflows = getRecurringEvents(recurringSpending);
    const recurringInflowEvents = getRecurringEvents(recurringIncome);

    // Build daily projection
    const projection: {
      date: string;
      projectedBalance: number;
      events: { name: string; amount: number }[];
    }[] = [];

    let balance = startingBalance;
    const billNames = new Set(bills.map((b) => b.name.toLowerCase()));

    for (let i = 0; i <= days; i++) {
      const date = addDays(now, i);
      const dayOfMonth = date.getDate();
      const events: { name: string; amount: number }[] = [];

      // Bills due on this day
      for (const bill of bills) {
        if (bill.dueDay === dayOfMonth) {
          events.push({ name: bill.name, amount: -bill.amount });
          balance -= bill.amount;
        }
      }

      // Recurring spending on this day (avoid double-counting with bills)
      for (const outflow of recurringOutflows) {
        if (outflow.dayOfMonth === dayOfMonth && !billNames.has(outflow.name.toLowerCase())) {
          events.push({ name: outflow.name, amount: -outflow.amount });
          balance -= outflow.amount;
        }
      }

      // Recurring income on this day
      for (const inflow of recurringInflowEvents) {
        if (inflow.dayOfMonth === dayOfMonth) {
          events.push({ name: inflow.name, amount: Math.abs(inflow.amount) });
          balance += Math.abs(inflow.amount);
        }
      }

      projection.push({
        date: format(date, "yyyy-MM-dd"),
        projectedBalance: Math.round(balance * 100) / 100,
        events,
      });
    }

    return NextResponse.json({
      startingBalance,
      projection,
    });
  } catch (error) {
    console.error("Error generating cash flow forecast:", error);
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 }
    );
  }
}
