"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const MAX_PHOTOS = 5;

interface SelfieRecord {
  id: string;
  imagePath: string;
  analysisResultClaude: string | null;
  analysisResultGemini: string | null;
  taskStatus: string | null;
  createdAt: string;
}

interface SelfieUploadProps {
  onSelfieCountChange?: (count: number, analyzedCount: number) => void;
}

function parseAnalysis(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : raw;
    return JSON.parse(jsonStr.trim());
  } catch {
    return null;
  }
}

export default function SelfieUpload({ onSelfieCountChange }: SelfieUploadProps) {
  const [selfies, setSelfies] = useState<SelfieRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasPending = selfies.some(
    (s) =>
      !s.analysisResultClaude &&
      !s.analysisResultGemini &&
      s.taskStatus !== "failed"
  );

  const analyzedCount = selfies.filter(
    (s) => s.analysisResultClaude || s.analysisResultGemini
  ).length;

  // Fetch selfies on mount and poll if any are pending
  const fetchSelfies = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_PATH}/api/quiz/selfie`);
      if (!res.ok) return;
      const data: SelfieRecord[] = await res.json();
      setSelfies(data);
    } catch {
      // Silently retry on next interval
    }
  }, []);

  useEffect(() => {
    fetchSelfies();
  }, [fetchSelfies]);

  // Poll every 3s while any selfie is pending
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(fetchSelfies, 3000);
    return () => clearInterval(timer);
  }, [hasPending, fetchSelfies]);

  // Notify parent of selfie count changes
  useEffect(() => {
    onSelfieCountChange?.(selfies.length, analyzedCount);
  }, [selfies.length, analyzedCount, onSelfieCountChange]);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("selfie", file);

      const res = await fetch(`${BASE_PATH}/api/quiz/selfie`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      // Refresh the list
      await fetchSelfies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) {
      handleUpload();
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/quiz/selfie`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      if (expandedId === id) setExpandedId(null);
      await fetchSelfies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    } finally {
      setDeleting(null);
    }
  }

  const canAddMore = selfies.length < MAX_PHOTOS && !uploading;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-100 mb-2">
          Upload Photos{" "}
          <span className="text-sm font-normal text-gray-500">
            ({selfies.length}/{MAX_PHOTOS})
          </span>
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Upload up to {MAX_PHOTOS} photos for AI analysis — selfies, full-body
          shots, or anything that shows your look. More variety = better
          recommendations.
        </p>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {selfies.map((selfie) => (
          <SelfieCard
            key={selfie.id}
            selfie={selfie}
            expanded={expandedId === selfie.id}
            isDeleting={deleting === selfie.id}
            onToggle={() =>
              setExpandedId(expandedId === selfie.id ? null : selfie.id)
            }
            onDelete={() => handleDelete(selfie.id)}
          />
        ))}

        {/* Add photo button */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-gray-400 hover:text-gray-300 transition-colors cursor-pointer"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span className="text-xs">Add photo</span>
          </button>
        )}
      </div>

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <svg
            className="animate-spin w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Uploading...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Expanded analysis results */}
      {expandedId && (
        <AnalysisDetail
          selfie={selfies.find((s) => s.id === expandedId)!}
          onClose={() => setExpandedId(null)}
        />
      )}
    </div>
  );
}

function SelfieCard({
  selfie,
  expanded,
  isDeleting,
  onToggle,
  onDelete,
}: {
  selfie: SelfieRecord;
  expanded: boolean;
  isDeleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const hasResults =
    selfie.analysisResultClaude || selfie.analysisResultGemini;
  const isFailed = selfie.taskStatus === "failed";
  const isPending = !hasResults && !isFailed;

  return (
    <div
      className={`relative aspect-[3/4] rounded-xl overflow-hidden border transition-all ${
        expanded
          ? "border-indigo-500 ring-2 ring-indigo-500/30"
          : hasResults
            ? "border-gray-700 hover:border-gray-500"
            : "border-gray-700"
      }`}
    >
      {/* Clickable area for viewing results */}
      <button
        type="button"
        onClick={hasResults ? onToggle : undefined}
        className={`w-full h-full ${hasResults ? "cursor-pointer" : "cursor-default"}`}
      >
        {/* Thumbnail */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE_PATH}/api/images/${selfie.imagePath}`}
          alt="Uploaded photo"
          className={`w-full h-full object-cover ${isPending || isDeleting ? "opacity-50" : ""}`}
        />

        {/* Status overlay */}
        {isPending && !isDeleting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <div className="relative w-8 h-8 mb-2">
              <div className="absolute inset-0 rounded-full border-2 border-gray-600" />
              <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 animate-spin" />
            </div>
            <p className="text-xs text-gray-300 font-medium">Analyzing...</p>
          </div>
        )}

        {isDeleting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-gray-600" />
              <div className="absolute inset-0 rounded-full border-2 border-t-red-400 animate-spin" />
            </div>
          </div>
        )}

        {isFailed && !isDeleting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <svg
              className="w-6 h-6 text-red-400 mb-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-xs text-red-300">Failed</p>
          </div>
        )}

        {hasResults && !isDeleting && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <div className="flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5 text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs text-gray-300">Tap to view</span>
            </div>
          </div>
        )}
      </button>

      {/* Delete button (top-right corner) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={isDeleting}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center transition-colors"
        title="Remove photo"
      >
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function AnalysisDetail({
  selfie,
  onClose,
}: {
  selfie: SelfieRecord;
  onClose: () => void;
}) {
  const claudeParsed = parseAnalysis(selfie.analysisResultClaude);
  const geminiParsed = parseAnalysis(selfie.analysisResultGemini);
  const parsed = claudeParsed || geminiParsed;

  if (!parsed) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-green-400">Analysis complete</p>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-400">
          Results saved but could not be displayed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold text-indigo-400">
          Analysis Results
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {"colorSeason" in parsed && parsed.colorSeason != null && (
          <ResultCard label="Color Season" value={String(parsed.colorSeason)} />
        )}
        {"faceShape" in parsed && parsed.faceShape != null && (
          <ResultCard label="Face Shape" value={String(parsed.faceShape)} />
        )}
        {"kibbeType" in parsed && parsed.kibbeType != null && (
          <ResultCard label="Kibbe Type" value={String(parsed.kibbeType)} />
        )}
        {"skinUndertone" in parsed && parsed.skinUndertone != null && (
          <ResultCard
            label="Skin Undertone"
            value={String(parsed.skinUndertone)}
          />
        )}
        {"hairColor" in parsed && parsed.hairColor != null && (
          <ResultCard label="Hair Color" value={String(parsed.hairColor)} />
        )}
        {"eyeColor" in parsed && parsed.eyeColor != null && (
          <ResultCard label="Eye Color" value={String(parsed.eyeColor)} />
        )}
      </div>
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-gray-200 font-medium mt-1">{value}</p>
    </div>
  );
}
