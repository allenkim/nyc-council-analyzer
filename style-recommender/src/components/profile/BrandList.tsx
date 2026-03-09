"use client";

import { useState, useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const BRAND_URLS: Record<string, string> = {
  "Uniqlo": "https://www.uniqlo.com",
  "COS": "https://www.cos.com",
  "Buck Mason": "https://www.buckmason.com",
  "Saturdays NYC": "https://www.saturdaysnyc.com",
  "Norse Projects": "https://www.norseprojects.com",
  "Todd Snyder": "https://www.toddsnyder.com",
  "A.P.C.": "https://www.apc-us.com",
  "Reiss": "https://www.reiss.com",
  "Corridor NYC": "https://corridornyc.com",
  "Corridor": "https://corridornyc.com",
  "Club Monaco": "https://www.clubmonaco.com",
  "Lululemon": "https://www.lululemon.com",
  "Quince": "https://www.onequince.com",
  "Everlane": "https://www.everlane.com",
  "Officine Générale": "https://www.officinegenerale.com",
  "Carhartt WIP": "https://www.carhartt-wip.com",
  "Alex Mill": "https://www.alexmill.com",
  "Sunspel": "https://www.sunspel.com",
  "Percival": "https://www.percivalclo.com",
  "J.Crew": "https://www.jcrew.com",
  "Mango": "https://www.mango.com",
  "H&M": "https://www.hm.com",
  "Zara": "https://www.zara.com",
  "GAP": "https://www.gap.com",
  "ASOS": "https://www.asos.com",
  "Banana Republic": "https://www.bananarepublic.com",
  "Abercrombie & Fitch": "https://www.abercrombie.com",
  "Massimo Dutti": "https://www.massimodutti.com",
  "ARKET": "https://www.arket.com",
  "Bonobos": "https://www.bonobos.com",
  "AllSaints": "https://www.allsaints.com",
  "Theory": "https://www.theory.com",
  "Rag & Bone": "https://www.rag-bone.com",
  "Paul Smith": "https://www.paulsmith.com",
  "Maison Kitsuné": "https://maisonkitsune.com",
  "Common Projects": "https://www.commonprojects.com",
  "Golden Goose": "https://www.goldengoose.com",
  "New Balance": "https://www.newbalance.com",
  "NN07": "https://www.nn07.com",
  "Ted Baker": "https://www.tedbaker.com",
  "Lemaire": "https://www.lemaire.fr",
  "Stussy": "https://www.stussy.com",
  "Scotch & Soda": "https://www.scotchandsoda.com",
  "Nike": "https://www.nike.com",
  "Adidas": "https://www.adidas.com",
  "Ralph Lauren": "https://www.ralphlauren.com",
  "Brooks Brothers": "https://www.brooksbrothers.com",
  "Patagonia": "https://www.patagonia.com",
  "The North Face": "https://www.thenorthface.com",
  "Barbour": "https://www.barbour.com",
  "Hugo Boss": "https://www.hugoboss.com",
  "Acne Studios": "https://www.acnestudios.com",
  "Our Legacy": "https://www.ourlegacy.com",
  "Stone Island": "https://www.stoneisland.com",
  "Arc'teryx": "https://www.arcteryx.com",
  "Filson": "https://www.filson.com",
  "Pendleton": "https://www.pendleton-usa.com",
  "Vans": "https://www.vans.com",
  "Converse": "https://www.converse.com",
};

function getBrandUrl(name: string): string | null {
  if (BRAND_URLS[name]) return BRAND_URLS[name];
  // Try case-insensitive match, then partial match (e.g. "Lululemon (ABC Pants)" → "Lululemon")
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(BRAND_URLS)) {
    const keyLower = key.toLowerCase();
    if (keyLower === lower || lower.startsWith(keyLower) || lower.includes(keyLower)) return url;
  }
  return null;
}

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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {brands.map((brand, i) => {
        const badge = priceRangeBadge(brand.priceRange || "");
        const product = brandImages[brand.name];
        const url = getBrandUrl(brand.name);
        return (
          <div
            key={i}
            className="flex rounded-lg border border-zinc-800 bg-zinc-900/70 overflow-hidden transition-colors hover:border-zinc-700"
          >
            <div className="flex-1 p-4 min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-white truncate hover:text-indigo-400 transition-colors"
                  >
                    {brand.name}
                    <svg className="inline-block ml-1 w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <h4 className="font-semibold text-white truncate">{brand.name}</h4>
                )}
                {brand.priceRange && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                {brand.reason}
              </p>
            </div>
            {product?.filename && (
              <div className="w-24 shrink-0 overflow-hidden bg-neutral-100 sm:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${basePath}/api/images/fashion/images/${product.filename}`}
                  alt={product.name || brand.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
