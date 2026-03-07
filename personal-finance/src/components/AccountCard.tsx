import { formatCurrency } from "@/lib/categories";
import PrivacyValue from "@/components/PrivacyValue";

interface AccountCardProps {
  name: string;
  institution: string;
  type: string;
  totalValue: number;
  holdingCount: number;
  compact?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  BANK: "M3 6l9-4 9 4v2H3V6z M3 20h18v2H3v-2z M5 10h2v8H5v-8z M9 10h2v8H9v-8z M13 10h2v8h-2v-8z M17 10h2v8h-2v-8z",
  BROKERAGE: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  CREDIT: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  LOAN: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  CRYPTO_EXCHANGE: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  REAL_ESTATE: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  OTHER: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
};

const TYPE_COLORS: Record<string, string> = {
  BANK: "#22c55e",
  BROKERAGE: "#6366f1",
  CREDIT: "#f59e0b",
  LOAN: "#ef4444",
  CRYPTO_EXCHANGE: "#f97316",
  REAL_ESTATE: "#ec4899",
  OTHER: "#8b949e",
};

// Normalize Plaid account types to our display types
function normalizeType(type: string): string {
  const upper = type.toUpperCase();
  const typeMap: Record<string, string> = {
    DEPOSITORY: "BANK",
    CHECKING: "BANK",
    SAVINGS: "BANK",
    INVESTMENT: "BROKERAGE",
    CREDIT: "CREDIT",
    LOAN: "LOAN",
    MORTGAGE: "LOAN",
  };
  return typeMap[upper] || upper;
}

// Clean account names (fix encoding issues like replacement characters)
function cleanName(name: string): string {
  return name.replace(/\uFFFD/g, "").replace(/\s+/g, " ").trim();
}

export default function AccountCard({
  name,
  institution,
  type,
  totalValue,
  holdingCount,
  compact = false,
}: AccountCardProps) {
  const displayType = normalizeType(type);
  const icon = TYPE_ICONS[displayType] || TYPE_ICONS.OTHER;
  const borderColor = TYPE_COLORS[displayType] || TYPE_COLORS.OTHER;
  const displayName = cleanName(name);

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${borderColor}15` }}
          >
            <svg className="w-5 h-5" fill="none" stroke={borderColor} viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{displayName}</h3>
            <p className="text-xs text-muted">{institution}</p>
          </div>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
          style={{ backgroundColor: `${borderColor}15`, color: borderColor }}
        >
          {displayType.replace("_", " ")}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-tight"><PrivacyValue maskLength={8}>{formatCurrency(totalValue)}</PrivacyValue></p>
          <p className="text-xs text-muted mt-1">
            {holdingCount} holding{holdingCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </>
  );

  if (compact) {
    return content;
  }

  return (
    <div
      className="bg-card border border-card-border rounded-xl p-5 hover:border-accent/30 transition-all hover:shadow-lg hover:shadow-accent/5"
      style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}
    >
      {content}
    </div>
  );
}
