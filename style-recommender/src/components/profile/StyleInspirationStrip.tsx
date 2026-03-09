"use client";

import { useState, useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface LookItem {
  id: string;
  filename: string;
  aesthetic: string;
}

interface StyleInspirationStripProps {
  aesthetics: string[];
}

export function StyleInspirationStrip({ aesthetics }: StyleInspirationStripProps) {
  const [images, setImages] = useState<LookItem[]>([]);
  const aestheticKey = aesthetics.join(",");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${basePath}/api/fashion/looks?aesthetic=${encodeURIComponent(aesthetics.join(","))}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const items: LookItem[] = data.items || [];

        // Pick 4 images spread across aesthetics
        const picked: LookItem[] = [];
        for (const aesthetic of aesthetics) {
          const matching = items.filter((l) => l.aesthetic === aesthetic);
          if (matching.length > 0 && picked.length < 4) {
            // Pick a random one from this aesthetic to vary across page loads
            picked.push(matching[Math.floor(Math.random() * matching.length)]);
          }
        }
        // Fill remaining slots
        for (const item of items) {
          if (picked.length >= 4) break;
          if (!picked.find((p) => p.id === item.id)) {
            picked.push(item);
          }
        }
        setImages(picked.slice(0, 4));
      } catch {
        // silently fail
      }
    }
    if (aesthetics.length > 0) load();
  }, [aestheticKey]);

  if (images.length === 0) return null;

  return (
    <div className="mb-4 flex gap-2 overflow-hidden rounded-lg">
      {images.map((img) => (
        <div key={img.id} className="flex-1 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${basePath}/api/images/fashion/looks/images/${img.filename}`}
            alt={`${img.aesthetic} style inspiration`}
            className="w-full aspect-[3/4] object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
