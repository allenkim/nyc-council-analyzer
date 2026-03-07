"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrencyExact } from "@/lib/categories";
import { SPENDING_CATEGORY_LABELS } from "@/lib/categories";
import { apiUrl } from "@/lib/api";
import { format } from "date-fns";

interface Transaction {
  id: string;
  name: string;
  merchantName: string | null;
  amount: number;
  category: string;
  date: string;
  pending: boolean;
  isRecurring: boolean;
  account: { name: string; institution: string };
}

interface Props {
  accounts: { id: string; name: string; institution: string }[];
  categories: string[];
}

export default function TransactionTable({ accounts, categories }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (accountId) params.set("accountId", accountId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    params.set("page", String(page));
    params.set("pageSize", "50");

    const res = await fetch(apiUrl(`/api/transactions?${params}`));
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [search, category, accountId, dateFrom, dateTo, sortBy, sortOrder, page]);

  useEffect(() => {
    const timer = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, category, accountId, dateFrom, dateTo]);

  function handleSort(col: string) {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder(col === "date" ? "desc" : "asc");
    }
  }

  const sortIcon = (col: string) =>
    sortBy === col ? (sortOrder === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {SPENDING_CATEGORY_LABELS[c] || c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.institution})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm bg-background border border-card-border rounded-lg"
            placeholder="To"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{total} transaction{total !== 1 ? "s" : ""}</span>
        {totalPages > 1 && (
          <span>Page {page} of {totalPages}</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-card-border text-left text-muted text-xs uppercase tracking-wider">
                <th
                  className="px-4 py-3 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("date")}
                >
                  Date{sortIcon("date")}
                </th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("name")}
                >
                  Description{sortIcon("name")}
                </th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("category")}
                >
                  Category{sortIcon("category")}
                </th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th
                  className="px-4 py-3 font-medium text-right cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("amount")}
                >
                  Amount{sortIcon("amount")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Loading...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-accent-light/30 transition-colors">
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                      {format(new Date(txn.date), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{txn.merchantName || txn.name}</span>
                        {txn.isRecurring && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                            Recurring
                          </span>
                        )}
                        {txn.pending && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                            Pending
                          </span>
                        )}
                      </div>
                      {txn.merchantName && txn.name !== txn.merchantName && (
                        <p className="text-xs text-muted mt-0.5">{txn.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {SPENDING_CATEGORY_LABELS[txn.category] || txn.category.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {txn.account.name}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${
                      txn.amount < 0 ? "text-success" : ""
                    }`}>
                      {txn.amount < 0 ? "+" : ""}{formatCurrencyExact(Math.abs(txn.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-card-border rounded-lg hover:bg-accent-light/50 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-card-border rounded-lg hover:bg-accent-light/50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
