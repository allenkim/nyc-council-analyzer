"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/categories";
import { apiUrl } from "@/lib/api";
import { format } from "date-fns";

interface GoalCardProps {
  goal: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string | null;
    category: string | null;
  };
}

export default function GoalCard({ goal }: GoalCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(goal.currentAmount));
  const [loading, setLoading] = useState(false);

  const progress = goal.targetAmount > 0
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    : 0;

  const isComplete = goal.currentAmount >= goal.targetAmount;

  async function handleUpdate() {
    setLoading(true);
    await fetch(apiUrl("/api/goals"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: goal.id, currentAmount: Number(amount) }),
    });
    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    await fetch(apiUrl(`/api/goals?id=${goal.id}`), { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">{goal.name}</h4>
          {goal.category && (
            <span className="text-xs text-muted">{goal.category}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isComplete && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
              Complete
            </span>
          )}
          <button
            onClick={handleDelete}
            className="text-xs text-muted hover:text-danger transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium">{formatCurrency(goal.currentAmount)}</span>
          <span className="text-muted">{formatCurrency(goal.targetAmount)}</span>
        </div>
        <div className="w-full h-2.5 bg-accent-light rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isComplete ? "bg-success" : "bg-accent"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted">{progress.toFixed(0)}%</span>
          {goal.targetDate && (
            <span className="text-xs text-muted">
              Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      {/* Update progress */}
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 px-2 py-1.5 text-sm bg-background border border-card-border rounded-lg"
          />
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-accent hover:underline"
        >
          Update progress
        </button>
      )}
    </div>
  );
}
