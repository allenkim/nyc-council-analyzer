import { prisma } from "@/lib/db";
import TransactionTable from "./TransactionTable";
import CategoryRulesManager from "./CategoryRulesManager";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const accounts = await prisma.account.findMany({
    select: { id: true, name: true, institution: true },
    orderBy: { name: "asc" },
  });

  const categories = await prisma.transaction.groupBy({
    by: ["category"],
    orderBy: { category: "asc" },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Transactions</h2>
        <p className="text-muted text-sm mt-1">
          Browse, search, and filter your transactions
        </p>
      </div>

      <TransactionTable
        accounts={accounts}
        categories={categories.map((c) => c.category)}
      />

      <details className="group">
        <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
          Manage category rules
        </summary>
        <div className="mt-3">
          <CategoryRulesManager />
        </div>
      </details>
    </div>
  );
}
