"use client";

import { useState, useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface KeyPiece {
  item: string;
  description: string;
  priority: "essential" | "recommended" | "nice-to-have";
}

interface KeyPiecesListProps {
  pieces: KeyPiece[];
}

interface ProductImage {
  filename: string;
  name?: string;
}

function priorityBadge(priority: string) {
  switch (priority) {
    case "essential":
      return "bg-emerald-900/40 text-emerald-300 border-emerald-800";
    case "recommended":
      return "bg-sky-900/40 text-sky-300 border-sky-800";
    case "nice-to-have":
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
    default:
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
}

/** Extract 1-2 key search terms from an item name */
function searchTerms(item: string): string {
  // Remove adjectives and keep the core item type
  const cleaned = item
    .replace(/\b(white|black|dark|navy|olive|clean|quality|tailored|relaxed|slim|modern|classic|structured)\b/gi, "")
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Take last 1-2 meaningful words (the noun)
  const words = cleaned.split(" ").filter(Boolean);
  return words.slice(-2).join(" ");
}

export function KeyPiecesList({ pieces }: KeyPiecesListProps) {
  const [images, setImages] = useState<Record<string, ProductImage | null>>({});
  const pieceKey = pieces.map((p) => p.item).join(",");

  useEffect(() => {
    if (!pieces || pieces.length === 0) return;

    async function fetchImages() {
      const results = await Promise.all(
        pieces.map(async (piece) => {
          try {
            const q = searchTerms(piece.item);
            if (!q) return { item: piece.item, product: null };
            const res = await fetch(
              `${basePath}/api/fashion/products?q=${encodeURIComponent(q)}&limit=1`
            );
            if (!res.ok) return { item: piece.item, product: null };
            const data = await res.json();
            const items = data.items || [];
            return {
              item: piece.item,
              product: items.length > 0 ? items[0] : null,
            };
          } catch {
            return { item: piece.item, product: null };
          }
        })
      );

      const imageMap: Record<string, ProductImage | null> = {};
      for (const result of results) {
        imageMap[result.item] = result.product;
      }
      setImages(imageMap);
    }

    fetchImages();
  }, [pieceKey]);

  if (!pieces || pieces.length === 0) return null;

  return (
    <div className="space-y-2">
      {pieces.map((piece, i) => {
        const product = images[piece.item];
        return (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 overflow-hidden"
          >
            <span
              className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityBadge(piece.priority)}`}
            >
              {piece.priority}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white">{piece.item}</h4>
              <p className="mt-0.5 text-sm text-zinc-300">
                {piece.description}
              </p>
            </div>
            {product?.filename && (
              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${basePath}/api/images/fashion/images/${product.filename}`}
                  alt={product.name || piece.item}
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
