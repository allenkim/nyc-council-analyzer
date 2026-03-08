"use client";

import { useRouter } from "next/navigation";
import { useTaskPoll } from "@/lib/use-task-poll";
import { useEffect, useState } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const TIPS = [
  "Analyzing your quiz responses...",
  "Evaluating color harmony and undertones...",
  "Determining your Kibbe body type...",
  "Curating brand recommendations...",
  "Building your wardrobe essentials...",
  "Finalizing your style archetype...",
];

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

interface ProfileGeneratingProps {
  taskId: string;
  taskStatus: string;
  taskCreatedAt: string;
}

export function ProfileGenerating({ taskId, taskStatus, taskCreatedAt }: ProfileGeneratingProps) {
  const router = useRouter();
  const { isCompleted, isFailed, task, startPolling } = useTaskPoll();
  const [tipIndex, setTipIndex] = useState(0);
  const [retrying, setRetrying] = useState(false);

  // Check if the task is stale (> 10 minutes old and still pending/processing)
  const isStale =
    taskStatus !== "completed" &&
    taskStatus !== "failed" &&
    Date.now() - new Date(taskCreatedAt).getTime() > STALE_THRESHOLD_MS;

  // Start polling on mount (unless already terminal or stale)
  useEffect(() => {
    if (taskStatus === "completed" || taskStatus === "failed" || isStale) return;
    startPolling(taskId);
  }, [taskId, taskStatus, isStale, startPolling]);

  // Rotate tips every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // When completed, reload the page to get the server-rendered profile
  useEffect(() => {
    if (isCompleted || taskStatus === "completed") {
      router.refresh();
    }
  }, [isCompleted, taskStatus, router]);

  const failed = isFailed || taskStatus === "failed" || isStale;
  const errorMessage = isStale
    ? "Profile generation timed out. Please try again."
    : task?.error || "Profile generation failed.";

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/profile`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to retry");
      const data = await res.json();
      if (data.taskId) {
        startPolling(data.taskId);
        setRetrying(false);
      }
    } catch {
      setRetrying(false);
    }
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-900/30 border border-red-800">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Generation Failed</h2>
        <p className="mb-6 text-sm text-zinc-400">{errorMessage}</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {retrying ? "Retrying..." : "Try Again"}
          </button>
          <button
            onClick={() => router.push("/quiz")}
            className="rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500"
          >
            Back to Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      {/* Animated spinner */}
      <div className="mb-8 flex justify-center">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-2 rounded-full border-2 border-t-violet-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        </div>
      </div>

      <h2 className="mb-2 text-xl font-bold text-white">
        Generating Your Style Profile
      </h2>
      <p className="mb-6 text-sm text-zinc-500">
        This usually takes 30-60 seconds. You can leave this page — your profile will be ready when you come back.
      </p>

      {/* Rotating tips */}
      <div className="h-6">
        <p className="text-sm text-indigo-400 transition-opacity duration-500">
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
}
