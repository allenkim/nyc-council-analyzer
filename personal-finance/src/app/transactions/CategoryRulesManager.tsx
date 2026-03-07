"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

interface CategoryRule {
  id: string;
  merchantPattern: string;
  matchType: string;
  category: string;
  priority: number;
}

export default function CategoryRulesManager() {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRules() {
    const res = await fetch(apiUrl("/api/category-rules"));
    if (res.ok) setRules(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchRules(); }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch(apiUrl("/api/category-rules"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantPattern: form.get("merchantPattern"),
        matchType: form.get("matchType"),
        category: form.get("category"),
        priority: Number(form.get("priority") || 0),
      }),
    });
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      fetchRules();
    }
  }

  async function handleDelete(id: string) {
    await fetch(apiUrl(`/api/category-rules?id=${id}`), { method: "DELETE" });
    fetchRules();
  }

  return (
    <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-medium text-muted">Auto-Categorization Rules</h3>
      <p className="text-xs text-muted">
        Rules override Plaid categories during sync. Higher priority rules match first.
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
        <label className="text-xs">
          Merchant Pattern
          <input
            name="merchantPattern"
            required
            placeholder="e.g. netflix"
            className="block mt-0.5 px-2 py-1.5 text-sm bg-background border border-card-border rounded-lg w-40"
          />
        </label>
        <label className="text-xs">
          Match Type
          <select
            name="matchType"
            className="block mt-0.5 px-2 py-1.5 text-sm bg-background border border-card-border rounded-lg"
          >
            <option value="contains">Contains</option>
            <option value="startsWith">Starts With</option>
            <option value="exact">Exact</option>
          </select>
        </label>
        <label className="text-xs">
          Category
          <input
            name="category"
            required
            placeholder="e.g. ENTERTAINMENT"
            className="block mt-0.5 px-2 py-1.5 text-sm bg-background border border-card-border rounded-lg w-40"
          />
        </label>
        <label className="text-xs">
          Priority
          <input
            name="priority"
            type="number"
            defaultValue={0}
            className="block mt-0.5 px-2 py-1.5 text-sm bg-background border border-card-border rounded-lg w-20"
          />
        </label>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90"
        >
          Add Rule
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-muted">No rules yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border text-left text-muted text-xs uppercase">
              <th className="pb-2 font-medium">Pattern</th>
              <th className="pb-2 font-medium">Match</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Priority</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/50">
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="py-2 font-medium">{rule.merchantPattern}</td>
                <td className="py-2 text-muted">{rule.matchType}</td>
                <td className="py-2 text-muted">{rule.category.replace(/_/g, " ")}</td>
                <td className="py-2 text-right tabular-nums">{rule.priority}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-xs text-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
