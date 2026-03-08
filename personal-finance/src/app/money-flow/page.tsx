import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import {
  formatCurrency,
  SPENDING_CATEGORY_COLORS,
  SPENDING_CATEGORY_LABELS,
} from "@/lib/categories";
import { startOfMonth, subMonths, format } from "date-fns";
import MonthlyChart from "./MonthlyChart";
import TransactionTable from "../transactions/TransactionTable";
import CategoryRulesManager from "../transactions/CategoryRulesManager";
import RecurringCharges from "../spending/RecurringCharges";
import SyncTransactionsButton from "../spending/SyncTransactionsButton";
import BillCard from "../bills/BillCard";
import AddBillForm from "../bills/AddBillForm";
import BillSuggestions from "../bills/BillSuggestion";
import ResetBillsButton from "../bills/ResetBillsButton";
import AddBudgetForm from "../budgets/AddBudgetForm";
import DeleteBudgetButton from "../budgets/DeleteBudgetButton";

export const dynamic = "force-dynamic";

export default async function MoneyFlowPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const thisMonthStart = startOfMonth(now);

  const [
    thisMonthTxns,
    recurringTxns,
    budgets,
    bills,
    accounts,
    transactionCategories,
    monthlyData,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        account: { userId: user.id },
        date: { gte: thisMonthStart },
        pending: false,
      },
      include: { account: true },
    }),
    prisma.transaction.findMany({
      where: {
        account: { userId: user.id },
        isRecurring: true,
        amount: { gt: 0 },
      },
      orderBy: { merchantName: "asc" },
    }),
    prisma.budgetGoal.findMany({
      where: { userId: user.id },
      orderBy: { category: "asc" },
    }),
    prisma.bill.findMany({
      where: { userId: user.id },
      orderBy: { dueDay: "asc" },
    }),
    prisma.account.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, institution: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: { account: { userId: user.id } },
      orderBy: { category: "asc" },
    }),
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = startOfMonth(subMonths(now, i - 1));
        return Promise.all([
          prisma.transaction.aggregate({
            where: {
              account: { userId: user.id },
              date: { gte: monthStart, lt: monthEnd },
              amount: { gt: 0 },
              pending: false,
            },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: {
              account: { userId: user.id },
              date: { gte: monthStart, lt: monthEnd },
              amount: { lt: 0 },
              pending: false,
            },
            _sum: { amount: true },
          }),
        ]).then(([spending, income]) => ({
          month: format(monthStart, "MMM"),
          spending: spending._sum.amount || 0,
          income: Math.abs(income._sum.amount || 0),
        }));
      })
    ).then((data) => data.reverse()),
  ]);

  // Summary calculations
  const thisMonthSpending = thisMonthTxns
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const thisMonthIncome = Math.abs(
    thisMonthTxns
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );
  const netSavings = thisMonthIncome - thisMonthSpending;
  const savingsRate = thisMonthIncome > 0 ? (netSavings / thisMonthIncome) * 100 : 0;

  // Spending by category
  const categoryTotals = new Map<string, number>();
  for (const txn of thisMonthTxns.filter((t) => t.amount > 0)) {
    categoryTotals.set(txn.category, (categoryTotals.get(txn.category) || 0) + txn.amount);
  }

  const spendingMap = new Map(categoryTotals);

  const categoryData = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({
      category,
      label: SPENDING_CATEGORY_LABELS[category] || category.replace(/_/g, " "),
      color: SPENDING_CATEGORY_COLORS[category] || SPENDING_CATEGORY_COLORS.OTHER,
      amount,
      percent: thisMonthSpending > 0 ? (amount / thisMonthSpending) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Budget data
  const budgetsWithSpending = budgets.map((budget) => {
    const spent = spendingMap.get(budget.category) || 0;
    return {
      ...budget,
      spent,
      remaining: budget.limit - spent,
      percentUsed: (spent / budget.limit) * 100,
    };
  });

  const unbudgetedCategories = Array.from(categoryTotals.keys()).filter(
    (cat) => !budgets.find((b) => b.category === cat)
  );

  // Recurring charges
  const recurringGroups = new Map<string, { name: string; amount: number; count: number }>();
  for (const txn of recurringTxns) {
    const key = txn.merchantName?.toLowerCase() || txn.name.toLowerCase();
    const existing = recurringGroups.get(key);
    if (existing) {
      existing.count++;
      existing.amount = txn.amount;
    } else {
      recurringGroups.set(key, { name: txn.merchantName || txn.name, amount: txn.amount, count: 1 });
    }
  }
  const recurringList = Array.from(recurringGroups.values())
    .filter((r) => r.count >= 2)
    .sort((a, b) => b.amount - a.amount);
  const recurringTotal = recurringList.reduce((sum, r) => sum + r.amount, 0);

  // Bills with status
  const currentDay = now.getDate();
  const billsWithStatus = bills.map((bill) => {
    let status: "paid" | "due_soon" | "overdue" | "upcoming" = "upcoming";
    if (bill.isPaid) status = "paid";
    else if (currentDay > bill.dueDay) status = "overdue";
    else if (bill.dueDay - currentDay <= 3) status = "due_soon";
    return { ...bill, status };
  });

  const overdueBills = billsWithStatus.filter((b) => b.status === "overdue");
  const dueSoonBills = billsWithStatus.filter((b) => b.status === "due_soon");
  const upcomingBills = billsWithStatus.filter((b) => b.status === "upcoming");
  const paidBills = billsWithStatus.filter((b) => b.status === "paid");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Money Flow</h2>
          <p className="text-muted text-sm mt-1">
            Income, spending, bills, and budgets — {format(now, "MMMM yyyy")}
          </p>
        </div>
        <SyncTransactionsButton />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Income</p>
          <p className="text-2xl font-bold mt-1 text-success">{formatCurrency(thisMonthIncome)}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Spending</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(thisMonthSpending)}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Net Savings</p>
          <p className={`text-2xl font-bold mt-1 ${netSavings >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrency(netSavings)}
          </p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-sm text-muted font-medium">Savings Rate</p>
          <p className={`text-2xl font-bold mt-1 ${savingsRate >= 0 ? "text-success" : "text-danger"}`}>
            {savingsRate.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Recurring & Subscriptions — prominent position */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-muted">Recurring & Subscriptions</h3>
            <p className="text-2xl font-bold mt-1">{formatCurrency(recurringTotal)}<span className="text-sm font-normal text-muted">/mo</span></p>
          </div>
          <ResetBillsButton />
        </div>

        {(overdueBills.length > 0 || dueSoonBills.length > 0) && (
          <div className="space-y-3 mb-4">
            {overdueBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
            {dueSoonBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        )}

        {(upcomingBills.length > 0 || paidBills.length > 0) && (
          <div className="space-y-3 mb-4">
            {upcomingBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
            {paidBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        )}

        <RecurringCharges charges={recurringList} />

        <BillSuggestions />

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
            + Add bill
          </summary>
          <div className="mt-3">
            <AddBillForm />
          </div>
        </details>
      </div>

      <MonthlyChart data={monthlyData} />

      {/* Spending by Category with Budget Progress */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted mb-4">Spending by Category</h3>
        <div className="space-y-4">
          {categoryData.map((cat) => {
            const budget = budgetsWithSpending.find((b) => b.category === cat.category);
            return (
              <div key={cat.category}>
                <div className="flex flex-wrap items-center justify-between text-sm mb-1 gap-x-4 gap-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium truncate">{cat.label}</span>
                    {budget && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        budget.percentUsed >= 100 ? "bg-danger/10 text-danger"
                          : budget.percentUsed >= 80 ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                      }`}>
                        {budget.percentUsed.toFixed(0)}% of {formatCurrency(budget.limit)}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                </div>
                <div className="w-full bg-card-border rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      budget && budget.percentUsed >= 100 ? "bg-danger"
                        : budget && budget.percentUsed >= 80 ? "bg-warning"
                        : ""
                    }`}
                    style={{
                      width: budget
                        ? `${Math.min(100, budget.percentUsed)}%`
                        : `${cat.percent}%`,
                      backgroundColor: budget ? undefined : cat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {unbudgetedCategories.length > 0 && (
          <div className="mt-4 p-3 bg-warning/5 border border-warning/20 rounded-lg">
            <p className="text-xs text-warning">
              {unbudgetedCategories.length} categories without budgets
            </p>
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
            Manage budgets
          </summary>
          <div className="mt-3 space-y-3">
            <AddBudgetForm existingCategories={budgets.map((b) => b.category)} />
            {budgetsWithSpending.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span>{SPENDING_CATEGORY_LABELS[b.category] || b.category}: {formatCurrency(b.limit)}/mo</span>
                <DeleteBudgetButton id={b.id} category={b.category} />
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Transactions */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted mb-4">Transactions</h3>
        <TransactionTable
          accounts={accounts}
          categories={transactionCategories.map((c) => c.category)}
        />
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
            Manage category rules
          </summary>
          <div className="mt-3">
            <CategoryRulesManager />
          </div>
        </details>
      </div>
    </div>
  );
}
