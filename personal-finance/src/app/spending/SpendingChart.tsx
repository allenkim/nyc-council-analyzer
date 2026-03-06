"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/categories";

interface CategoryData {
  category: string;
  label: string;
  color: string;
  amount: number;
  percent: number;
}

interface SpendingChartProps {
  data: CategoryData[];
  total: number;
}

export default function SpendingChart({ data, total }: SpendingChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        No spending data for this period.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.label,
    value: d.amount,
    color: d.color,
  }));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
      <div className="w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0">
        {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        ) : <div className="w-40 h-40 sm:w-48 sm:h-48" />}
      </div>
      <div className="flex-1 w-full space-y-2">
        {data.slice(0, 6).map((entry) => (
          <div key={entry.category} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate">{entry.label}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-muted">{entry.percent.toFixed(1)}%</span>
              <span className="font-medium w-20 sm:w-24 text-right">{formatCurrency(entry.amount)}</span>
            </div>
          </div>
        ))}
        {data.length > 6 && (
          <p className="text-xs text-muted">+{data.length - 6} more categories</p>
        )}
      </div>
    </div>
  );
}
