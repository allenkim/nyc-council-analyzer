import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { RemovedTransaction, Transaction } from "plaid";
import { plaidSyncTransactionsSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = plaidSyncTransactionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { plaidItemId } = parsed.data;

    // Get all PlaidItems to sync (or just one if specified)
    const plaidItems = plaidItemId
      ? await prisma.plaidItem.findMany({ where: { id: plaidItemId } })
      : await prisma.plaidItem.findMany();

    if (plaidItems.length === 0) {
      return NextResponse.json({ error: "No Plaid connections found" }, { status: 404 });
    }

    // Load category rules once for the entire sync batch
    const categoryRules = await prisma.categoryRule.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    const results = [];

    for (const item of plaidItems) {
      try {
        // Get our accounts linked to this PlaidItem
        const ourAccounts = await prisma.account.findMany({
          where: { plaidItemId: item.id },
        });

        const accountMap = new Map(
          ourAccounts.map((a) => [a.plaidAccountId, a])
        );

        let cursor = item.transactionsCursor || undefined;
        let hasMore = true;
        let addedCount = 0;
        let modifiedCount = 0;
        let removedCount = 0;

        // Paginate through all transactions
        while (hasMore) {
          const response = await plaidClient.transactionsSync({
            access_token: decrypt(item.accessToken),
            cursor,
            count: 500,
          });

          const { added, modified, removed, next_cursor, has_more } = response.data;

          // Process added transactions
          for (const txn of added) {
            const account = accountMap.get(txn.account_id);
            if (!account) continue;

            await upsertTransaction(account.id, txn, categoryRules);
            addedCount++;
          }

          // Process modified transactions
          for (const txn of modified) {
            const account = accountMap.get(txn.account_id);
            if (!account) continue;

            await upsertTransaction(account.id, txn, categoryRules);
            modifiedCount++;
          }

          // Process removed transactions
          for (const removed_txn of removed) {
            await removeTransaction(removed_txn);
            removedCount++;
          }

          cursor = next_cursor;
          hasMore = has_more;
        }

        // Update cursor and last sync time
        await prisma.plaidItem.update({
          where: { id: item.id },
          data: {
            transactionsCursor: cursor,
            lastTransactionSync: new Date(),
          },
        });

        // Detect recurring transactions
        await detectRecurringTransactions(item.id);

        results.push({
          itemId: item.id,
          institution: item.institution,
          success: true,
          added: addedCount,
          modified: modifiedCount,
          removed: removedCount,
        });
      } catch (itemError) {
        console.error(`Error syncing transactions for item ${item.id}:`, itemError);
        results.push({
          itemId: item.id,
          institution: item.institution,
          success: false,
          error: "Failed to sync transactions",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error syncing transactions:", error);
    return NextResponse.json(
      { error: "Failed to sync transactions" },
      { status: 500 }
    );
  }
}

interface CachedCategoryRule {
  merchantPattern: string;
  matchType: string;
  category: string;
}

function matchCategoryRule(
  rules: CachedCategoryRule[],
  merchantName: string | null,
  name: string
): string | null {
  const target = (merchantName || name).toLowerCase();
  for (const rule of rules) {
    const pattern = rule.merchantPattern.toLowerCase();
    let matched = false;
    if (rule.matchType === "exact") {
      matched = target === pattern;
    } else if (rule.matchType === "startsWith") {
      matched = target.startsWith(pattern);
    } else {
      matched = target.includes(pattern);
    }
    if (matched) return rule.category;
  }
  return null;
}

async function upsertTransaction(
  accountId: string,
  txn: Transaction,
  categoryRules: CachedCategoryRule[]
) {
  const plaidCategory = txn.personal_finance_category?.primary ||
    txn.category?.[0] ||
    "OTHER";

  // Check category rules first (sorted by priority DESC)
  const ruleCategory = matchCategoryRule(
    categoryRules,
    txn.merchant_name || null,
    txn.name
  );

  const category = ruleCategory || plaidCategory;

  const subcategory = txn.personal_finance_category?.detailed ||
    txn.category?.[1] ||
    null;

  const data = {
    accountId,
    name: txn.name,
    merchantName: txn.merchant_name || null,
    amount: txn.amount,
    category,
    subcategory,
    date: new Date(txn.date),
    pending: txn.pending,
  };

  await prisma.transaction.upsert({
    where: { plaidTransactionId: txn.transaction_id },
    update: data,
    create: {
      plaidTransactionId: txn.transaction_id,
      ...data,
    },
  });
}

async function removeTransaction(removed: RemovedTransaction) {
  if (removed.transaction_id) {
    await prisma.transaction.deleteMany({
      where: { plaidTransactionId: removed.transaction_id },
    });
  }
}

function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[*#]+/g, "") // strip * and #
    .replace(/\b(inc|llc|corp|ltd|co)\b\.?/gi, "") // strip corporate suffixes
    .replace(/\d+$/g, "") // strip trailing numbers
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

const KNOWN_BILLING_PERIODS = [7, 14, 30, 60, 90];

async function detectRecurringTransactions(plaidItemId: string) {
  const accounts = await prisma.account.findMany({
    where: { plaidItemId },
    select: { id: true },
  });

  const accountIds = accounts.map((a) => a.id);

  // 180-day window for better quarterly detection
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 180);

  const transactions = await prisma.transaction.findMany({
    where: {
      accountId: { in: accountIds },
      date: { gte: windowStart },
      amount: { gt: 0 },
    },
    orderBy: { date: "asc" },
  });

  // Group by normalized merchant name
  const merchantGroups = new Map<string, typeof transactions>();

  for (const txn of transactions) {
    const key = normalizeMerchantName(txn.merchantName || txn.name);
    const group = merchantGroups.get(key) || [];
    group.push(txn);
    merchantGroups.set(key, group);
  }

  const recurringIds: string[] = [];

  for (const [, group] of merchantGroups) {
    if (group.length < 2) continue;

    // Check if amounts are similar (within 20%)
    const amounts = group.map((t) => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const amountsSimilar = amounts.every(
      (a) => Math.abs(a - avgAmount) / avgAmount < 0.2
    );

    if (!amountsSimilar) continue;

    // Check for regular intervals
    const dates = group.map((t) => t.date.getTime()).sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Check if intervals are consistent (within 10 days of average)
    const intervalsConsistent = intervals.every(
      (i) => Math.abs(i - avgInterval) < 10
    );

    let isRecurring = false;

    if (group.length === 2) {
      // 2-transaction guard: single interval must be near a known billing period
      const interval = intervals[0];
      isRecurring = KNOWN_BILLING_PERIODS.some(
        (period) => Math.abs(interval - period) <= 5
      );
    } else {
      // 3+ transactions: standard consistency check, 7-95 day range (weekly to quarterly)
      isRecurring = intervalsConsistent && avgInterval >= 7 && avgInterval <= 95;
    }

    if (isRecurring) {
      recurringIds.push(...group.map((t) => t.id));
    }
  }

  // Only set isRecurring: true, never reset to false (preserves manual flags)
  if (recurringIds.length > 0) {
    await prisma.transaction.updateMany({
      where: { id: { in: recurringIds } },
      data: { isRecurring: true },
    });
  }
}
