"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrencyExact } from "@/lib/categories";
import { SPENDING_CATEGORY_LABELS } from "@/lib/categories";
import { apiUrl } from "@/lib/api";

interface Suggestion {
  merchantName: string;
  displayName: string;
  avgAmount: number;
  category: string;
  lastDate: string;
  transactionCount: number;
}

export default function BillSuggestions() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiUrl("/api/bills/suggestions"))
      .then((r) => r.ok ? r.json() : [])
      .then(setSuggestions)
      .finally(() => setLoading(false));
  }, []);

  async function addAsBill(s: Suggestion) {
    setAdding(s.merchantName);
    const res = await fetch(apiUrl("/api/bills"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: s.displayName,
        amount: s.avgAmount,
        dueDay: new Date(s.lastDate).getDate(),
        category: s.category,
      }),
    });
    if (res.ok) {
      setSuggestions((prev) => prev.filter((x) => x.merchantName !== s.merchantName));
      router.refresh();
    }
    setAdding(null);
  }

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-accent flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
        Suggested Bills ({suggestions.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((s) => (
          <div
            key={s.merchantName}
            className="bg-card border border-accent/20 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-sm">{s.displayName}</p>
              <p className="text-xs text-muted mt-0.5">
                {SPENDING_CATEGORY_LABELS[s.category] || s.category.replace(/_/g, " ")} · {s.transactionCount} charges · ~{formatCurrencyExact(s.avgAmount)}
              </p>
            </div>
            <button
              onClick={() => addAsBill(s)}
              disabled={adding === s.merchantName}
              className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 whitespace-nowrap"
            >
              {adding === s.merchantName ? "Adding..." : "Add as Bill"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
