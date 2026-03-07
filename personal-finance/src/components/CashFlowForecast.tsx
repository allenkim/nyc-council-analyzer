"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/categories";
import { format } from "date-fns";

interface ProjectionPoint {
  date: string;
  projectedBalance: number;
  events: { name: string; amount: number }[];
}

export default function CashFlowForecast() {
  const [data, setData] = useState<ProjectionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/cash-flow"))
      .then((r) => r.ok ? r.json() : { projection: [] })
      .then((d) => setData(d.projection || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted mb-4">Cash Flow Forecast</h3>
        <div className="h-48 flex items-center justify-center text-muted text-sm">Loading...</div>
      </div>
    );
  }

  if (data.length === 0) return null;

  const chartData = data
    .filter((_, i) => i % 3 === 0 || i === data.length - 1) // Sample every 3 days
    .map((d) => ({
      date: format(new Date(d.date), "MMM d"),
      fullDate: format(new Date(d.date), "MMM d, yyyy"),
      balance: d.projectedBalance,
    }));

  const minBalance = Math.min(...data.map((d) => d.projectedBalance));

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground transition-colors flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
        Cash Flow Forecast (90 days)
        {minBalance < 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger">
            Warning: Projected negative balance
          </span>
        )}
      </summary>
      <div className="mt-3 bg-card border border-card-border rounded-xl p-6">
        <div className="h-48 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--muted)" }}
                axisLine={{ stroke: "var(--card-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted)" }}
                axisLine={{ stroke: "var(--card-border)" }}
                tickLine={false}
                tickFormatter={(val) => formatCurrency(val)}
                width={80}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatCurrency(Number(value)), "Projected Balance"]}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#balanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </details>
  );
}
