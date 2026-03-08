"use client";

import { useState } from "react";

export interface FeedItemData {
  id: string;
  brand: string;
  itemName: string;
  description: string;
  category: string;
  priceRange: string | null;
  sourceUrl: string | null;
  imagePath: string | null;
  aiRationale: string | null;
  batchId: string | null;
  createdAt: string;
}

interface FeedCardProps {
  item: FeedItemData;
  onAction: (itemId: string, action: "heart" | "skip" | "save") => void;
  isActioning?: boolean;
}

export default function FeedCard({ item, onAction, isActioning }: FeedCardProps) {
  const [rationaleExpanded, setRationaleExpanded] = useState(false);

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const imageUrl = item.imagePath
    ? `${basePath}/api/images/${item.imagePath}`
    : null;

  return (
    <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden max-w-md w-full mx-auto">
      {/* Product Image */}
      <div className="relative w-full h-64 bg-gray-700 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${item.brand} ${item.itemName}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center text-gray-500">
            <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">No image available</span>
          </div>
        )}
        {/* Category badge */}
        <span className="absolute top-3 left-3 bg-gray-900/80 text-gray-300 text-xs px-2 py-1 rounded-full capitalize">
          {item.category}
        </span>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Brand & Name */}
        <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">
          {item.brand}
        </p>
        <h3 className="text-lg font-bold text-white mt-1">{item.itemName}</h3>

        {/* Description */}
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          {item.description}
        </p>

        {/* Price Range */}
        {item.priceRange && (
          <p className="text-sm text-gray-300 mt-2 font-medium">
            {item.priceRange}
          </p>
        )}

        {/* AI Rationale */}
        {item.aiRationale && (
          <div className="mt-3">
            <button
              onClick={() => setRationaleExpanded(!rationaleExpanded)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <svg
                className={`w-3 h-3 transition-transform ${rationaleExpanded ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Why this was picked for you
            </button>
            {rationaleExpanded && (
              <p className="text-xs text-gray-400 mt-2 pl-4 border-l-2 border-indigo-500/30 leading-relaxed">
                {item.aiRationale}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 mt-5">
          {/* Skip */}
          <button
            onClick={() => onAction(item.id, "skip")}
            disabled={isActioning}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Skip"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm">Skip</span>
          </button>

          {/* Save */}
          <button
            onClick={() => onAction(item.id, "save")}
            disabled={isActioning}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Save for later"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-sm">Save</span>
          </button>

          {/* Heart */}
          <button
            onClick={() => onAction(item.id, "heart")}
            disabled={isActioning}
            className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Love it"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-sm">Love</span>
          </button>
        </div>
      </div>
    </div>
  );
}
