"use client";

import { useState, useRef } from "react";
import { useTaskPoll } from "@/lib/use-task-poll";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface SelfieAnalysis {
  id: string;
  analysisResultClaude: string | null;
  analysisResultGemini: string | null;
}

interface SelfieUploadProps {
  existingAnalysis?: SelfieAnalysis | null;
  onAnalysisComplete: (analysis: SelfieAnalysis) => void;
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

export default function SelfieUpload({ existingAnalysis, onAnalysisComplete }: SelfieUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SelfieAnalysis | null>(existingAnalysis || null);
  const [selfieId, setSelfieId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { task, isWaiting, isCompleted, isFailed, startPolling } = useTaskPoll();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setAnalysis(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please select a photo first.");
      return;
    }

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

      const result = await res.json();
      setSelfieId(result.id);

      if (result.taskId) {
        // Start polling the task
        startPolling(result.taskId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  // When task completes, fetch the updated selfie record
  if (isCompleted && selfieId && !analysis) {
    fetch(`${BASE_PATH}/api/quiz/selfie`)
      .then((res) => res.json())
      .then((selfies: SelfieAnalysis[]) => {
        const updated = selfies.find((s) => s.id === selfieId);
        if (updated) {
          setAnalysis(updated);
          onAnalysisComplete(updated);
        }
      })
      .catch(() => {});
  }

  const claudeParsed = analysis ? parseAnalysis(analysis.analysisResultClaude) : null;
  const geminiParsed = analysis ? parseAnalysis(analysis.analysisResultGemini) : null;
  const parsed = claudeParsed || geminiParsed;

  const showWaiting = uploading || isWaiting;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-100 mb-2">Upload a Selfie</h3>
        <p className="text-sm text-gray-400 mb-4">
          A well-lit front-facing photo helps our AI analyze your color season, face shape, and
          body proportions for more personalized recommendations.
        </p>
      </div>

      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="relative border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
      >
        {preview ? (
          <img
            src={preview}
            alt="Selfie preview"
            className="mx-auto max-h-80 rounded-lg object-cover"
          />
        ) : (
          <div className="space-y-3">
            <svg
              className="mx-auto w-12 h-12 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
            <p className="text-gray-400">Click to select a photo</p>
            <p className="text-xs text-gray-600">JPG, PNG, or WebP</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Upload button */}
      {preview && !analysis && !showWaiting && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Upload & Analyze
        </button>
      )}

      {/* Waiting for AI analysis */}
      {showWaiting && (
        <div className="text-center py-6">
          <svg className="animate-spin w-8 h-8 mx-auto text-indigo-400 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">
            {uploading ? "Uploading photo..." : task?.status === "processing" ? "AI is analyzing your photo..." : "Waiting for AI analysis..."}
          </p>
          <p className="text-gray-600 text-xs mt-1">This may take a minute</p>
        </div>
      )}

      {/* Error */}
      {(error || isFailed) && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error || task?.error || "Analysis failed. Please try again."}
        </div>
      )}

      {/* Analysis results */}
      {analysis && parsed && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5 space-y-4">
          <h4 className="text-md font-semibold text-indigo-400">Analysis Results</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <ResultCard label="Skin Undertone" value={String(parsed.skinUndertone)} />
            )}
            {"hairColor" in parsed && parsed.hairColor != null && (
              <ResultCard label="Hair Color" value={String(parsed.hairColor)} />
            )}
            {"eyeColor" in parsed && parsed.eyeColor != null && (
              <ResultCard label="Eye Color" value={String(parsed.eyeColor)} />
            )}
          </div>
          {!claudeParsed && !geminiParsed && (
            <p className="text-sm text-gray-400">
              Analysis completed but results could not be parsed. Your data has been saved.
            </p>
          )}
        </div>
      )}

      {analysis && !parsed && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <p className="text-sm text-green-400">
            Selfie uploaded and analyzed successfully. Your data has been saved.
          </p>
        </div>
      )}
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
