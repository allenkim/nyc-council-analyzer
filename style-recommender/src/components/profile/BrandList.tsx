"use client";

interface Brand {
  name: string;
  reason: string;
  priceRange: string;
}

interface BrandListProps {
  brands: Brand[];
}

function priceRangeBadge(priceRange: string) {
  const lower = priceRange.toLowerCase();
  if (lower.includes("luxury") || lower.includes("high")) {
    return { label: priceRange, className: "bg-amber-900/40 text-amber-300" };
  }
  if (lower.includes("mid") || lower.includes("moderate")) {
    return { label: priceRange, className: "bg-sky-900/40 text-sky-300" };
  }
  if (
    lower.includes("budget") ||
    lower.includes("affordable") ||
    lower.includes("low")
  ) {
    return {
      label: priceRange,
      className: "bg-emerald-900/40 text-emerald-300",
    };
  }
  return { label: priceRange, className: "bg-zinc-800 text-zinc-300" };
}

export function BrandList({ brands }: BrandListProps) {
  if (!brands || brands.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {brands.map((brand, i) => {
        const badge = priceRangeBadge(brand.priceRange || "");
        return (
          <div
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 transition-colors hover:border-zinc-700"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h4 className="font-semibold text-white">{brand.name}</h4>
              {brand.priceRange && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">
              {brand.reason}
            </p>
          </div>
        );
      })}
    </div>
  );
}
