"use client";

import { useState } from "react";
import NetWorthHistory from "@/components/NetWorthHistory";

interface SnapshotData {
  date: string;
  netWorth: number;
}

interface Props {
  allData: SnapshotData[];
  projectionData?: SnapshotData[];
}

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: 0 },
] as const;

export default function NetWorthHistorySection({ allData, projectionData }: Props) {
  const [range, setRange] = useState<string>("All");

  const filtered = range === "All"
    ? allData
    : allData.filter((d) => {
        const cutoff = Date.now() - RANGES.find((r) => r.label === range)!.days * 86400000;
        return new Date(d.date).getTime() >= cutoff;
      });

  return (
    <div>
      <div className="flex items-center justify-end gap-1 mb-2">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.label)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              range === r.label
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground hover:bg-accent-light/50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <NetWorthHistory data={filtered} projectionData={range === "All" ? projectionData : undefined} />
    </div>
  );
}
