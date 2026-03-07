import { CATEGORY_COLORS, CATEGORY_LABELS, formatCurrencyExact } from "@/lib/categories";
import PrivacyValue from "@/components/PrivacyValue";

interface HoldingsTableProps {
  holdings: {
    id: string;
    name: string;
    ticker: string | null;
    category: string;
    quantity: number;
    price: number;
    value: number;
    totalCostBasis?: number;
    gainLoss?: number;
    gainLossPercent?: number;
  }[];
  totalValue: number;
}

export default function HoldingsTable({ holdings, totalValue }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="text-center py-12 text-muted text-sm">
        No holdings yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-card-border text-left text-muted text-xs uppercase tracking-wider">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium pl-4">Category</th>
            <th className="pb-3 font-medium text-right pl-4">Quantity</th>
            <th className="pb-3 font-medium text-right pl-4">Price</th>
            <th className="pb-3 font-medium text-right pl-4">Value</th>
            <th className="pb-3 font-medium text-right pl-4">Gain/Loss</th>
            <th className="pb-3 font-medium text-right pl-4">% of Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border/50">
          {holdings.map((holding) => (
            <tr key={holding.id} className="hover:bg-accent-light/30 transition-colors">
              <td className="py-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{holding.name}</span>
                  {holding.ticker && (
                    <span className="shrink-0 text-xs text-muted bg-accent-light px-1.5 py-0.5 rounded">{holding.ticker}</span>
                  )}
                </div>
              </td>
              <td className="py-3 pl-4">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[holding.category] || CATEGORY_COLORS.OTHER }}
                  />
                  {CATEGORY_LABELS[holding.category] || holding.category}
                </span>
              </td>
              <td className="py-3 text-right tabular-nums pl-4"><PrivacyValue>{holding.quantity.toLocaleString()}</PrivacyValue></td>
              <td className="py-3 text-right tabular-nums pl-4"><PrivacyValue>{formatCurrencyExact(holding.price)}</PrivacyValue></td>
              <td className="py-3 text-right font-medium tabular-nums pl-4"><PrivacyValue>{formatCurrencyExact(holding.value)}</PrivacyValue></td>
              <td className="py-3 text-right tabular-nums pl-4">
                {holding.totalCostBasis && holding.totalCostBasis > 0 ? (
                  <span className={holding.gainLoss && holding.gainLoss >= 0 ? "text-success" : "text-danger"}>
                    <PrivacyValue>
                      {holding.gainLoss && holding.gainLoss >= 0 ? "+" : ""}
                      {formatCurrencyExact(holding.gainLoss || 0)}
                      <span className="text-xs ml-1">
                        ({holding.gainLossPercent && holding.gainLossPercent >= 0 ? "+" : ""}
                        {(holding.gainLossPercent || 0).toFixed(1)}%)
                      </span>
                    </PrivacyValue>
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="py-3 text-right text-muted tabular-nums pl-4">
                {totalValue > 0 ? ((holding.value / totalValue) * 100).toFixed(1) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
