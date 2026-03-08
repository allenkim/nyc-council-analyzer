"use client";

import { useState, useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface Brand {
  name: string;
  reason: string;
  priceRange: string;
}

interface BrandListProps {
  brands: Brand[];
}

interface ProductImage {
  filename: string;
  brand?: string;
  name?: string;
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
  const [brandImages, setBrandImages] = useState<Record<string, ProductImage | null>>({});
  const brandKey = brands.map(b => b.name).join(",");

  useEffect(() => {
    if (!brands || brands.length === 0) return;

    async function fetchBrandImages() {
      const results = await Promise.all(
        brands.map(async (brand) => {
          try {
            const res = await fetch(
              `${basePath}/api/fashion/products?brand=${encodeURIComponent(brand.name)}&limit=1`
            );
            if (!res.ok) return { name: brand.name, product: null };
            const data = await res.json();
            const items = data.items || [];
            return {
              name: brand.name,
              product: items.length > 0 ? items[0] : null,
            };
          } catch {
            return { name: brand.name, product: null };
          }
        })
      );

      const imageMap: Record<string, ProductImage | null> = {};
      for (const result of results) {
        imageMap[result.name] = result.product;
      }
      setBrandImages(imageMap);
    }

    fetchBrandImages();
  }, [brandKey]);

  if (!brands || brands.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {brands.map((brand, i) => {
        const badge = priceRangeBadge(brand.priceRange || "");
        const product = brandImages[brand.name];
        return (
          <div
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-900/70 overflow-hidden transition-colors hover:border-zinc-700"
          >
            {product?.filename && (
              <div className="aspect-[4/3] overflow-hidden bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${basePath}/api/images/fashion/images/${product.filename}`}
                  alt={product.name || brand.name}
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-screen opacity-90"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-4">
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
          </div>
        );
      })}
    </div>
  );
}
