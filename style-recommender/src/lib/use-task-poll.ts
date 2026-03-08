"use client";

import { useState, useEffect, useCallback } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface TaskStatus {
  id: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  error: string | null;
  targetId: string | null;
}

/**
 * Hook to poll a StyleTask until it reaches a terminal state.
 * Returns the task status and a function to start polling.
 */
export function useTaskPoll(options?: { interval?: number }) {
  const interval = options?.interval ?? 3000;
  const [taskId, setTaskId] = useState<string | null>(null);
  const [task, setTask] = useState<TaskStatus | null>(null);
  const [polling, setPolling] = useState(false);

  const startPolling = useCallback((id: string) => {
    setTaskId(id);
    setTask({ id, type: "", status: "pending", error: null, targetId: null });
    setPolling(true);
  }, []);

  const reset = useCallback(() => {
    setTaskId(null);
    setTask(null);
    setPolling(false);
  }, []);

  useEffect(() => {
    if (!taskId || !polling) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`${BASE_PATH}/api/tasks/${taskId}`);
        if (!res.ok) return;
        const data: TaskStatus = await res.json();
        if (cancelled) return;
        setTask(data);

        if (data.status === "completed" || data.status === "failed") {
          setPolling(false);
        }
      } catch {
        // Silently retry on network errors
      }
    }

    // Poll immediately, then on interval
    poll();
    const timer = setInterval(poll, interval);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [taskId, polling, interval]);

  return {
    task,
    isWaiting: polling || (task?.status === "pending" || task?.status === "processing"),
    isCompleted: task?.status === "completed",
    isFailed: task?.status === "failed",
    startPolling,
    reset,
  };
}
