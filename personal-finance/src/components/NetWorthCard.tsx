import { formatCurrency } from "@/lib/categories";
import PrivacyValue from "@/components/PrivacyValue";

interface NetWorthCardProps {
  netWorth: number;
  accountCount: number;
  holdingCount: number;
}

export default function NetWorthCard({ netWorth, accountCount, holdingCount }: NetWorthCardProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-accent/10 via-card to-card border border-accent/20 rounded-2xl p-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="relative">
        <p className="text-sm text-muted font-medium tracking-wide uppercase">Total Net Worth</p>
        <p className="text-5xl font-light tracking-tight mt-3"><PrivacyValue maskLength={10}>{formatCurrency(netWorth)}</PrivacyValue></p>
        <div className="flex gap-6 mt-5 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {accountCount} account{accountCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            {holdingCount} holding{holdingCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
