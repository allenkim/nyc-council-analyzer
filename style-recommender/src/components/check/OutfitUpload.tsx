"use client";

import { useState, useRef, useCallback } from "react";
import { useTaskPoll } from "@/lib/use-task-poll";
import FeedbackView from "./FeedbackView";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface OutfitCheckResult {
  id: string;
  imagePath: string;
  feedbackClaude: string | null;
  feedbackGemini: string | null;
  createdAt: string;
}

export default function OutfitUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OutfitCheckResult | null>(null);
  const [outfitCheckId, setOutfitCheckId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { task, isWaiting, isCompleted, isFailed, startPolling, reset: resetTask } = useTaskPoll();

  const handleFile = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.");
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
    },
    [handleFile]
  );

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("outfit", file);

      const res = await fetch(`${basePath}/api/outfit-check`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setOutfitCheckId(data.id);

      if (data.taskId) {
        startPolling(data.taskId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // When task completes, fetch the updated outfit check record
  if (isCompleted && outfitCheckId && !result) {
    fetch(`${basePath}/api/outfit-check`)
      .then((res) => res.json())
      .then((checks: OutfitCheckResult[]) => {
        const updated = checks.find((c) => c.id === outfitCheckId);
        if (updated) setResult(updated);
      })
      .catch(() => {});
  }

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setOutfitCheckId(null);
    resetTask();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const showWaiting = loading || isWaiting;

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      {!result && !showWaiting && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
              ${preview ? "pb-4" : "py-16"}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />

            {preview ? (
              <div className="space-y-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Outfit preview"
                  className="max-h-80 mx-auto rounded-lg object-contain"
                />
                <p className="text-sm text-gray-500">{file?.name}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-4xl text-gray-300">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0l-3 3m3-3l3 3M6.75 19.25h10.5A2.25 2.25 0 0019.5 17V7A2.25 2.25 0 0017.25 4.75H6.75A2.25 2.25 0 004.5 7v10a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">
                  Drop your outfit photo here, or click to browse
                </p>
                <p className="text-sm text-gray-400">
                  JPG, PNG, or WebP up to 10 MB
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!file || loading}
              className={`
                flex-1 py-3 px-6 rounded-lg font-medium text-white transition-colors
                ${!file || loading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-black hover:bg-gray-800 cursor-pointer"}
              `}
            >
              Get Feedback
            </button>
            {file && !loading && (
              <button
                onClick={reset}
                className="py-3 px-6 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}

      {/* Waiting for AI feedback */}
      {showWaiting && (
        <div className="text-center py-16">
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="Outfit being analyzed"
              className="max-h-48 mx-auto rounded-lg object-contain mb-6 opacity-75"
            />
          )}
          <svg className="animate-spin w-10 h-10 mx-auto text-indigo-400 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400">
            {loading ? "Uploading outfit..." : task?.status === "processing" ? "AI is reviewing your outfit..." : "Waiting for AI feedback..."}
          </p>
          <p className="text-gray-600 text-xs mt-1">This may take a minute</p>
        </div>
      )}

      {/* Error */}
      {(error || isFailed) && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error || task?.error || "Outfit check failed. Please try again."}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Outfit Feedback</h3>
            <button
              onClick={reset}
              className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Check another outfit
            </button>
          </div>

          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="Checked outfit"
              className="max-h-64 mx-auto rounded-lg object-contain"
            />
          )}

          <FeedbackView
            feedbackClaude={result.feedbackClaude}
            feedbackGemini={result.feedbackGemini}
          />
        </div>
      )}
    </div>
  );
}
