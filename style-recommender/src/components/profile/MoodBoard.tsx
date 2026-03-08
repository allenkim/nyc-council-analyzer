"use client";

import { useState, useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface LookItem {
  id: string;
  filename: string;
  aesthetic: string;
}

interface MoodBoardProps {
  aesthetics: string[];
  maxImages?: number;
}

export function MoodBoard({ aesthetics, maxImages = 6 }: MoodBoardProps) {
  const [images, setImages] = useState<LookItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${basePath}/api/fashion/looks?aesthetic=${encodeURIComponent(aesthetics.join(","))}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const items: LookItem[] = data.items || [];

        // Pick images spread across aesthetics
        const picked: LookItem[] = [];
        const perAesthetic = Math.max(2, Math.ceil(maxImages / aesthetics.length));
        for (const aesthetic of aesthetics) {
          const matching = items.filter((l) => l.aesthetic === aesthetic);
          for (let i = 0; i < Math.min(perAesthetic, matching.length) && picked.length < maxImages; i++) {
            picked.push(matching[i]);
          }
        }
        setImages(picked);
      } catch {
        // silently fail
      }
    }
    if (aesthetics.length > 0) load();
  }, [aesthetics, maxImages]);

  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl overflow-hidden">
      {images.map((img, i) => (
        <div
          key={img.id}
          className={`overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${basePath}/api/images/fashion/looks/images/${img.filename}`}
            alt={`${img.aesthetic} style`}
            className="w-full h-full object-cover aspect-[3/4]"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
