"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";

export default function GenerateButton({ onGenerated }: { onGenerated: () => void }) {
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/advisor"), { method: "POST" });
      if (res.ok) onGenerated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={generate} disabled={loading} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
      {loading ? "Analyzing..." : "Generate Advice"}
    </button>
  );
}
