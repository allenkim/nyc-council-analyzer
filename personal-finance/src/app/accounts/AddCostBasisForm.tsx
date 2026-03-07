"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

export default function AddCostBasisForm({ holdingId, holdingName }: { holdingId: string; holdingName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch(apiUrl("/api/cost-basis"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holdingId,
        purchaseDate: form.get("purchaseDate"),
        purchasePrice: Number(form.get("purchasePrice")),
        quantity: Number(form.get("quantity")),
      }),
    });

    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-accent hover:underline"
      >
        + Add cost basis
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 border border-card-border rounded-lg bg-card/50">
      <p className="text-xs text-muted mb-2">Add cost basis for {holdingName}</p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
        <label className="text-xs">
          Date
          <input
            name="purchaseDate"
            type="date"
            required
            defaultValue={new Date().toISOString().split("T")[0]}
            className="block mt-0.5 px-2 py-1.5 text-sm bg-background border border-card-border rounded-lg w-36"
          />
        </label>
        <label className="text-xs">
          Price/Unit
          <input
            name="purchasePrice"
            type="number"
            step="0.01"
            required
            className="block mt-0.5 px-2 py-1.5 text-sm bg-background border border-card-border rounded-lg w-28"
          />
        </label>
        <label className="text-xs">
          Quantity
          <input
            name="quantity"
            type="number"
            step="0.0001"
            required
            className="block mt-0.5 px-2 py-1.5 text-sm bg-background border border-card-border rounded-lg w-28"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
