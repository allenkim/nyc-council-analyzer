"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";

export default function GenerateButton({ onGenerated }: { onGenerated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/advisor"), { method: "POST" });
      if (res.ok) {
        onGenerated();
      } else {
        const msg = await res.text();
        setError(msg || "Failed to generate advice");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={generate} disabled={loading} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
        {loading ? "Analyzing..." : "Generate Advice"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
