"use client";

import { useState, useCallback } from "react";
import { useTaskPoll } from "@/lib/use-task-poll";
import FeedCard, { type FeedItemData } from "./FeedCard";
import SavedItems from "./SavedItems";

type Tab = "new" | "saved" | "hearted";

interface FeedViewProps {
  initialUnseen: FeedItemData[];
  initialSaved: FeedItemData[];
  initialHearted: FeedItemData[];
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function FeedView({
  initialUnseen,
  initialSaved,
  initialHearted,
}: FeedViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const [unseenItems, setUnseenItems] = useState<FeedItemData[]>(initialUnseen);
  const [savedItems, setSavedItems] = useState<FeedItemData[]>(initialSaved);
  const [heartedItems, setHeartedItems] = useState<FeedItemData[]>(initialHearted);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isWaiting, isCompleted, isFailed, startPolling, reset: resetTask, task } = useTaskPoll();

  const hasNoItems = unseenItems.length === 0 && savedItems.length === 0 && heartedItems.length === 0;
  const isFirstVisit = hasNoItems && !isWaiting;

  const generateRecommendations = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/feed`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate recommendations");
      }

      const data = await res.json();
      if (data.taskId) {
        startPolling(data.taskId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [startPolling]);

  // When task completes, fetch updated feed
  if (isCompleted) {
    resetTask();
    fetch(`${basePath}/api/feed`)
      .then((res) => res.json())
      .then((feed) => {
        setUnseenItems(feed.unseen || []);
        setSavedItems(feed.saved || []);
        setHeartedItems(feed.hearted || []);
        setActiveTab("new");
      })
      .catch(() => {});
  }

  const handleAction = useCallback(
    async (itemId: string, action: "heart" | "skip" | "save") => {
      setIsActioning(true);
      setError(null);
      try {
        const res = await fetch(`${basePath}/api/feed/interact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedItemId: itemId, action }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to record interaction");
        }

        // Move the item from unseen to the appropriate list
        const item = unseenItems.find((i) => i.id === itemId);
        if (item) {
          setUnseenItems((prev) => prev.filter((i) => i.id !== itemId));

          if (action === "heart") {
            setHeartedItems((prev) => [item, ...prev]);
          } else if (action === "save") {
            setSavedItems((prev) => [item, ...prev]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsActioning(false);
      }
    },
    [unseenItems]
  );

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "new", label: "New for You", count: unseenItems.length },
    { key: "saved", label: "Saved", count: savedItems.length },
    { key: "hearted", label: "Hearted", count: heartedItems.length },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? "bg-indigo-500 text-indigo-100"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {(error || isFailed) && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm">
          {error || task?.error || "Feed generation failed. Please try again."}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "new" && (
        <div>
          {/* First visit: no items at all */}
          {isFirstVisit && (
            <div className="text-center py-20">
              <svg className="w-16 h-16 mx-auto text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <h2 className="text-xl font-bold text-white mb-2">
                Ready to discover your style?
              </h2>
              <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                Based on your style profile, we&apos;ll generate personalized clothing recommendations just for you.
              </p>
              <button
                onClick={generateRecommendations}
                disabled={isWaiting}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Generate Your First Recommendations
              </button>
            </div>
          )}

          {/* Waiting for AI generation */}
          {isWaiting && (
            <div className="text-center py-16">
              <svg className="w-10 h-10 mx-auto text-indigo-400 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-gray-400">
                {task?.status === "processing" ? "AI is curating recommendations..." : "Waiting for AI to generate recommendations..."}
              </p>
              <p className="text-gray-600 text-xs mt-1">This may take a minute</p>
            </div>
          )}

          {/* Show current card */}
          {!isWaiting && unseenItems.length > 0 && (
            <div>
              <p className="text-center text-xs text-gray-500 mb-4">
                {unseenItems.length} item{unseenItems.length !== 1 ? "s" : ""} to review
              </p>
              <FeedCard
                item={unseenItems[0]}
                onAction={handleAction}
                isActioning={isActioning}
              />
            </div>
          )}

          {/* All items reviewed: offer to generate more */}
          {!isWaiting && !isFirstVisit && unseenItems.length === 0 && (
            <div className="text-center py-16">
              <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-white mb-1">
                All caught up!
              </h3>
              <p className="text-gray-400 mb-5 text-sm">
                You&apos;ve reviewed all your current recommendations.
              </p>
              <button
                onClick={generateRecommendations}
                disabled={isWaiting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Get More Recommendations
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "saved" && (
        <SavedItems
          items={savedItems}
          emptyMessage="Items you save will appear here."
        />
      )}

      {activeTab === "hearted" && (
        <SavedItems
          items={heartedItems}
          emptyMessage="Items you heart will appear here."
        />
      )}
    </div>
  );
}
