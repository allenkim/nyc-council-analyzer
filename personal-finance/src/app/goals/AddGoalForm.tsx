"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

export default function AddGoalForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch(apiUrl("/api/goals"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        targetAmount: Number(form.get("targetAmount")),
        currentAmount: Number(form.get("currentAmount") || 0),
        targetDate: form.get("targetDate") || null,
        category: form.get("category") || null,
      }),
    });

    setLoading(false);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <h3 className="text-sm font-medium text-muted mb-4">Add Goal</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <label className="text-xs">
          Name
          <input
            name="name"
            required
            placeholder="e.g. Emergency Fund"
            className="block mt-0.5 px-3 py-2 text-sm bg-background border border-card-border rounded-lg w-48"
          />
        </label>
        <label className="text-xs">
          Target Amount
          <input
            name="targetAmount"
            type="number"
            step="0.01"
            required
            placeholder="10000"
            className="block mt-0.5 px-3 py-2 text-sm bg-background border border-card-border rounded-lg w-32"
          />
        </label>
        <label className="text-xs">
          Current Amount
          <input
            name="currentAmount"
            type="number"
            step="0.01"
            defaultValue={0}
            className="block mt-0.5 px-3 py-2 text-sm bg-background border border-card-border rounded-lg w-32"
          />
        </label>
        <label className="text-xs">
          Target Date
          <input
            name="targetDate"
            type="date"
            className="block mt-0.5 px-3 py-2 text-sm bg-background border border-card-border rounded-lg w-40"
          />
        </label>
        <label className="text-xs">
          Category
          <input
            name="category"
            placeholder="optional"
            className="block mt-0.5 px-3 py-2 text-sm bg-background border border-card-border rounded-lg w-32"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Goal"}
        </button>
      </form>
    </div>
  );
}
