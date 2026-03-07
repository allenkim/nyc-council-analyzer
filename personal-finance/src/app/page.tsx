import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import NetWorthCard from "@/components/NetWorthCard";
import AllocationChart from "@/components/AllocationChart";
import AccountCard from "@/components/AccountCard";
import CashFlowForecast from "@/components/CashFlowForecast";
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

  const accountsWithValue = accounts
    .map((a) => ({
      ...a,
      totalValue: a.holdings.reduce((sum, h) => sum + h.value, 0),
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const allHoldings = accounts.flatMap((a) => a.holdings);
  const netWorth = allHoldings.reduce((sum, h) => sum + h.value, 0);

  const allocationData = ASSET_CATEGORIES.map((category) => ({
    category,
    value: allHoldings
      .filter((h) => h.category === category)
      .reduce((sum, h) => sum + h.value, 0),
  }));

  // Category breakdown (merged from Breakdown page)
  const categoryBreakdown = ASSET_CATEGORIES.map((category) => {
    const categoryHoldings = allHoldings.filter((h) => h.category === category);
    const categoryValue = categoryHoldings.reduce((sum, h) => sum + h.value, 0);
    return {
      category,
      label: CATEGORY_LABELS[category],
      color: CATEGORY_COLORS[category],
      value: categoryValue,
      percent: netWorth > 0 ? (categoryValue / netWorth) * 100 : 0,
      count: categoryHoldings.length,
    };
  }).filter((c) => c.count > 0);

  // Net worth history (merged from History page)
  const chartData = snapshots.map((s) => ({
    date: s.createdAt.toISOString(),
    netWorth: s.netWorth,
  }));

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

      {chartData.length > 0 && (
        <NetWorthHistorySection allData={chartData} projectionData={projectionData} />
      )}

      <AllocationChart data={allocationData} />

      {categoryBreakdown.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h3 className="text-sm font-medium text-muted mb-4">Allocation Breakdown</h3>
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
                    <span className="text-muted">{formatPercent(cat.percent)}</span>
                    <span className="font-semibold w-28 text-right">{formatCurrency(cat.value)}</span>
                  </div>
                </div>
                <div className="w-full bg-card-border rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CashFlowForecast />

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
