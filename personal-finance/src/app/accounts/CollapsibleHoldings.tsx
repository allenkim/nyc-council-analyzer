"use client";

import { useState } from "react";

export default function CollapsibleHoldings({
  children,
  holdingCount,
}: {
  children: React.ReactNode;
  holdingCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-card-border pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors w-full text-left"
      >
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Holdings ({holdingCount})
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
