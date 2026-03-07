"use client";

import type { FeedItemData } from "./FeedCard";

interface SavedItemsProps {
  items: FeedItemData[];
  emptyMessage?: string;
}

export default function SavedItems({ items, emptyMessage = "No items yet." }: SavedItemsProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const imageUrl = item.driveFileId
          ? `https://drive.google.com/uc?id=${item.driveFileId}`
          : null;

        return (
          <div
            key={item.id}
            className="bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
          >
            {/* Image */}
            <div className="w-full h-40 bg-gray-700 flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`${item.brand} ${item.itemName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">
                {item.brand}
              </p>
              <h4 className="text-sm font-bold text-white mt-0.5 line-clamp-2">
                {item.itemName}
              </h4>
              {item.priceRange && (
                <p className="text-xs text-gray-400 mt-1">{item.priceRange}</p>
              )}
              <p className="text-xs text-gray-500 capitalize mt-1">{item.category}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
