"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";
import type { Recommendation } from "./AdvisorClient";

export default function RecommendationCard({
  rec,
  onDismiss,
}: {
  rec: Recommendation;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    try {
      const res = await fetch(apiUrl(`/api/advisor/${rec.id}`), { method: "PATCH" });
      if (res.ok) onDismiss(rec.id);
    } finally {
      setDismissing(false);
    }
  }

  const priorityColor =
    rec.priority >= 8 ? "border-l-accent" :
    rec.priority >= 5 ? "border-l-warning" :
    "border-l-muted";

  return (
    <div className={`bg-card border border-card-border ${priorityColor} border-l-4 rounded-xl p-5 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{rec.title}</p>
          <p className="text-sm text-muted mt-1">{rec.summary}</p>
          {rec.details && expanded && (
            <p className="text-sm text-muted mt-2 whitespace-pre-line">{rec.details}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {rec.details && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-accent hover:underline">
              {expanded ? "Less" : "More"}
            </button>
          )}
          <button onClick={handleDismiss} disabled={dismissing} className="text-muted hover:text-foreground transition-colors" title="Dismiss">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-light text-muted">
          {rec.category}
        </span>
      </div>
    </div>
  );
}
