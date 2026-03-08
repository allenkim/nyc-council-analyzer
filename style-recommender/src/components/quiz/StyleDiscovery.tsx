"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface ManifestImage {
  filename: string;
  aesthetic: string;
}

interface ManifestRound {
  images: ManifestImage[];
}

interface Manifest {
  rounds: ManifestRound[];
}

interface Selections {
  [round: string]: string[];
}

interface Weights {
  [aesthetic: string]: number;
}

interface StyleDiscoveryData {
  selections: Selections;
  weights: Weights;
}

interface StyleDiscoveryProps {
  onChange: (value: string) => void;
  initialValue?: string;
}

function computeWeights(selections: Selections, manifest: Manifest): Weights {
  const counts: Record<string, number> = {};
  let total = 0;

  for (const [roundStr, filenames] of Object.entries(selections)) {
    const roundIdx = parseInt(roundStr, 10);
    const round = manifest.rounds[roundIdx];
    if (!round) continue;

    for (const filename of filenames) {
      const img = round.images.find((i) => i.filename === filename);
      if (img) {
        counts[img.aesthetic] = (counts[img.aesthetic] || 0) + 1;
        total++;
      }
    }
  }

  if (total === 0) return {};

  const weights: Weights = {};
  for (const [aesthetic, count] of Object.entries(counts)) {
    weights[aesthetic] = Math.round((count / total) * 100);
  }

  // Ensure percentages sum to 100 by adjusting the largest
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum !== 100 && Object.keys(weights).length > 0) {
    const largest = Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
    weights[largest] += 100 - sum;
  }

  return weights;
}

function formatAestheticLabel(key: string): string {
  return key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function StyleDiscovery({ onChange, initialValue }: StyleDiscoveryProps) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [selections, setSelections] = useState<Selections>({});
  const [showResults, setShowResults] = useState(false);
  const hasInteractedRef = useRef(false);

  // Restore saved state on mount — skip if the component has emitted its own changes
  useEffect(() => {
    if (hasInteractedRef.current || !initialValue) return;
    try {
      const parsed: StyleDiscoveryData = JSON.parse(initialValue);
      if (parsed.selections && Object.keys(parsed.selections).length > 0) {
        setSelections(parsed.selections);
        if (parsed.weights && Object.keys(parsed.weights).length > 0) {
          setShowResults(true);
        }
      }
    } catch {
      // Invalid initial value — start fresh
    }
  }, [initialValue]);

  // Fetch manifest
  useEffect(() => {
    async function fetchManifest() {
      try {
        const res = await fetch(`${basePath}/api/quiz/manifest`);
        if (!res.ok) throw new Error("Failed to load quiz images");
        const data: Manifest = await res.json();
        setManifest(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    }
    fetchManifest();
  }, []);

  const totalRounds = manifest?.rounds.length ?? 0;

  // Notify parent of changes
  const notifyChange = useCallback(
    (sel: Selections, man: Manifest) => {
      const weights = computeWeights(sel, man);
      const data: StyleDiscoveryData = { selections: sel, weights };
      onChange(JSON.stringify(data));
    },
    [onChange],
  );

  function toggleImage(filename: string) {
    if (!manifest) return;
    hasInteractedRef.current = true;

    const roundKey = String(currentRound);
    const current = selections[roundKey] || [];
    let next: string[];

    if (current.includes(filename)) {
      next = current.filter((f) => f !== filename);
    } else if (current.length >= 2) {
      // Already at max — replace the oldest selection
      next = [current[1], filename];
    } else {
      next = [...current, filename];
    }

    const updated = { ...selections, [roundKey]: next };
    setSelections(updated);
    notifyChange(updated, manifest);
  }

  function handleNext() {
    if (currentRound < totalRounds - 1) {
      setCurrentRound((r) => r + 1);
    } else {
      setShowResults(true);
    }
  }

  function handlePrevious() {
    if (showResults) {
      setShowResults(false);
    } else {
      setCurrentRound((r) => Math.max(r - 1, 0));
    }
  }

  function handleRetake() {
    setSelections({});
    setCurrentRound(0);
    setShowResults(false);
    if (manifest) {
      notifyChange({}, manifest);
    }
  }

  // Sorted weights for results display
  const sortedWeights = useMemo(() => {
    if (!manifest) return [];
    const weights = computeWeights(selections, manifest);
    return Object.entries(weights).sort((a, b) => b[1] - a[1]);
  }, [selections, manifest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading style quiz...
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
        {error || "Failed to load quiz data"}
      </div>
    );
  }

  // Results screen
  if (showResults) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-zinc-100">Your Style DNA</h3>
          <p className="text-zinc-400 mt-1 text-sm">
            Based on your selections, here are your aesthetic leanings.
          </p>
        </div>

        {sortedWeights.length > 0 ? (
          <div className="space-y-3">
            {sortedWeights.map(([aesthetic, pct]) => (
              <div key={aesthetic}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-zinc-300">
                    {formatAestheticLabel(aesthetic)}
                  </span>
                  <span className="text-sm text-zinc-500">{pct}%</span>
                </div>
                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            No selections made. Go back and pick some outfits you like.
          </p>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handlePrevious}
            className="px-5 py-2.5 rounded-lg font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={handleRetake}
            className="px-5 py-2.5 rounded-lg font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Retake
          </button>
        </div>
      </div>
    );
  }

  // Quiz round screen
  const round = manifest.rounds[currentRound];
  const roundSelections = selections[String(currentRound)] || [];
  const progress = ((currentRound + 1) / totalRounds) * 100;
  const hasSelection = roundSelections.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-zinc-500">
            Round {currentRound + 1} of {totalRounds}
          </span>
          <span className="text-sm text-zinc-500">
            Pick 1-2 favorites
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 2x2 image grid */}
      <div className="grid grid-cols-2 gap-3">
        {round.images.map((img) => {
          const isSelected = roundSelections.includes(img.filename);
          const imageSrc = `${basePath}/api/images/fashion/looks/images/${img.filename}`;

          return (
            <button
              key={img.filename}
              type="button"
              onClick={() => toggleImage(img.filename)}
              className={`relative rounded-xl overflow-hidden transition-all duration-200 focus:outline-none ${
                isSelected
                  ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-900 scale-[1.02]"
                  : "ring-1 ring-zinc-700 hover:ring-zinc-500"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Fashion look"
                className="w-full aspect-[3/4] object-cover"
                loading="lazy"
              />

              {/* Selection checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentRound === 0}
          className="px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!hasSelection}
          className="px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {currentRound < totalRounds - 1 ? "Next" : "See Results"}
        </button>
      </div>
    </div>
  );
}
