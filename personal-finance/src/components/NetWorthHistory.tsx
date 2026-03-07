"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/categories";
import { format } from "date-fns";

interface SnapshotData {
  date: string;
  netWorth: number;
}

interface NetWorthHistoryProps {
  data: SnapshotData[];
  projectionData?: SnapshotData[];
}

export default function NetWorthHistory({ data, projectionData }: NetWorthHistoryProps) {
  if (data.length === 0) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted mb-4">Net Worth Over Time</h3>
        <div className="flex items-center justify-center h-64 text-muted text-sm">
          No snapshots yet. Snapshots are created when you save your portfolio state.
        </div>
      </div>
    );
  }

  // Build combined chart data
  const chartData = data.map((d) => ({
    date: format(new Date(d.date), "MMM d"),
    fullDate: format(new Date(d.date), "MMM d, yyyy"),
    actual: d.netWorth,
    projected: undefined as number | undefined,
  }));

  if (projectionData && projectionData.length > 0) {
    // Add bridge point: last actual value also appears as first projected
    const lastActual = data[data.length - 1];
    chartData[chartData.length - 1].projected = lastActual.netWorth;

    for (const p of projectionData) {
      chartData.push({
        date: format(new Date(p.date), "MMM ''yy"),
        fullDate: format(new Date(p.date), "MMM d, yyyy"),
        actual: undefined as unknown as number,
        projected: p.netWorth,
      });
    }
  }

  const hasProjection = projectionData && projectionData.length > 0;

  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <h3 className="text-sm font-medium text-muted mb-4">Net Worth Over Time</h3>
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
              formatter={(value: any, name?: string) => [
                formatCurrency(Number(value)),
                name === "actual" ? "Actual" : "Projected",
              ]}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            {hasProjection && (
              <Legend
                formatter={(value: string) =>
                  value === "actual" ? "Actual" : "Projected"
                }
              />
            )}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
            {hasProjection && (
              <Line
                type="monotone"
                dataKey="projected"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
