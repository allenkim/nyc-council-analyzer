import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import NetWorthCard from "@/components/NetWorthCard";
import AllocationChart from "@/components/AllocationChart";
import AccountCard from "@/components/AccountCard";
import CashFlowForecast from "@/components/CashFlowForecast";
import { ASSET_CATEGORIES } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    include: { holdings: true },
  });

  // Sort accounts by total value descending so high-value accounts appear first
  accounts.sort((a, b) => {
    const aVal = a.holdings.reduce((sum, h) => sum + h.value, 0);
    const bVal = b.holdings.reduce((sum, h) => sum + h.value, 0);
    return bVal - aVal;
  });

  const allHoldings = accounts.flatMap((a) => a.holdings);
  const netWorth = allHoldings.reduce((sum, h) => sum + h.value, 0);

  const allocationData = ASSET_CATEGORIES.map((category) => ({
    category,
    value: allHoldings
      .filter((h) => h.category === category)
      .reduce((sum, h) => sum + h.value, 0),
  }));

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

      <AllocationChart data={allocationData} />

      <CashFlowForecast />

      {accounts.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-muted mb-3">Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts
              .filter((a) => a.holdings.reduce((sum, h) => sum + h.value, 0) > 0)
              .map((account) => (
              <AccountCard
                key={account.id}
                name={account.name}
                institution={account.institution}
                type={account.type}
                totalValue={account.holdings.reduce((sum, h) => sum + h.value, 0)}
                holdingCount={account.holdings.length}
              />
            ))}
          </div>
          {accounts.some((a) => a.holdings.reduce((sum, h) => sum + h.value, 0) === 0) && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
                {accounts.filter((a) => a.holdings.reduce((sum, h) => sum + h.value, 0) === 0).length} accounts with $0 balance
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3 opacity-60">
                {accounts
                  .filter((a) => a.holdings.reduce((sum, h) => sum + h.value, 0) === 0)
                  .map((account) => (
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
