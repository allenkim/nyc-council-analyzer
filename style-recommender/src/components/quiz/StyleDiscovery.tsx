"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// --- Types ---

interface PoolManifest {
  pools: Record<string, { filename: string }[]>;
}

interface DiscoveryImage {
  filename: string;
  aesthetic: string;
}

type Phase = 1 | 2 | 3;

interface Weights {
  [aesthetic: string]: number;
}

interface StyleDiscoveryData {
  selections: Record<string, string[]>;
  weights: Weights;
  topAesthetics?: string[];
}

interface StyleDiscoveryProps {
  onChange: (value: string) => void;
  initialValue?: string;
}

// --- Constants ---

const PHASE_1_ROUNDS = 3;
const PHASE_2_ROUNDS = 2;
const PHASE_3_ROUNDS = 3; // round-robin of top 3

const PHASE_INFO: Record<Phase, { label: string; instruction: string; max: number; min: number }> = {
  1: { label: "Discovery", instruction: "Pick the looks that catch your eye", max: 3, min: 0 },
  2: { label: "Narrowing", instruction: "Which would you actually wear?", max: 2, min: 1 },
  3: { label: "Finals", instruction: "You have to pick one", max: 1, min: 1 },
};

// --- Utilities ---

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatAestheticLabel(key: string): string {
  return key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Pick one unused image from the pool for a given aesthetic */
function pickImage(
  pools: Record<string, { filename: string }[]>,
  aesthetic: string,
  used: Set<string>,
): DiscoveryImage | null {
  const pool = pools[aesthetic];
  if (!pool) return null;
  const img = pool.find((p) => !used.has(p.filename));
  if (!img) return null;
  return { filename: img.filename, aesthetic };
}

/** Build Phase 1 rounds: 3 rounds × 6 images, covering all aesthetics */
function buildPhase1(manifest: PoolManifest): { rounds: DiscoveryImage[][]; used: Set<string> } {
  const aesthetics = shuffle(Object.keys(manifest.pools));
  const rounds: DiscoveryImage[][] = [];
  const used = new Set<string>();

  for (let r = 0; r < PHASE_1_ROUNDS; r++) {
    const round: DiscoveryImage[] = [];
    for (let i = r * 6; i < (r + 1) * 6 && i < aesthetics.length; i++) {
      const img = pickImage(manifest.pools, aesthetics[i], used);
      if (img) {
        round.push(img);
        used.add(img.filename);
      }
    }
    rounds.push(shuffle(round));
  }

  return { rounds, used };
}

/** Compute top N aesthetics from selections across given rounds */
function getTopAesthetics(
  rounds: DiscoveryImage[][],
  selections: Record<string, string[]>,
  startKey: number,
  n: number,
): string[] {
  const counts: Record<string, number> = {};
  for (let i = 0; i < rounds.length; i++) {
    const key = String(startKey + i);
    const picked = selections[key] || [];
    for (const filename of picked) {
      const img = rounds[i].find((im) => im.filename === filename);
      if (img) {
        counts[img.aesthetic] = (counts[img.aesthetic] || 0) + 1;
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([aes]) => aes);
}

/** Build Phase 2 rounds: 2 rounds showing top 6 aesthetics with new images */
function buildPhase2(
  manifest: PoolManifest,
  topAesthetics: string[],
  usedImages: Set<string>,
): { rounds: DiscoveryImage[][]; used: Set<string> } {
  const used = new Set(usedImages);
  const rounds: DiscoveryImage[][] = [];

  for (let r = 0; r < PHASE_2_ROUNDS; r++) {
    const round: DiscoveryImage[] = [];
    for (const aes of topAesthetics) {
      const img = pickImage(manifest.pools, aes, used);
      if (img) {
        round.push(img);
        used.add(img.filename);
      }
    }
    rounds.push(shuffle(round));
  }

  return { rounds, used };
}

/** Build Phase 3 matchups: round-robin of top 3 aesthetics */
function buildPhase3(
  manifest: PoolManifest,
  topAesthetics: string[],
  usedImages: Set<string>,
): { rounds: DiscoveryImage[][]; used: Set<string> } {
  const used = new Set(usedImages);
  const top3 = topAesthetics.slice(0, 3);
  const matchups = [
    [top3[0], top3[1]],
    [top3[0], top3[2]],
    [top3[1], top3[2]],
  ];

  const rounds: DiscoveryImage[][] = [];
  for (const [a, b] of matchups) {
    if (!a || !b) continue;
    const round: DiscoveryImage[] = [];
    for (const aes of [a, b]) {
      const img = pickImage(manifest.pools, aes, used);
      if (img) {
        round.push(img);
        used.add(img.filename);
      }
    }
    if (round.length === 2) rounds.push(round);
  }

  return { rounds, used };
}

/** Compute final weights from all phases with multipliers */
function computeFinalWeights(
  allRounds: { rounds: DiscoveryImage[][]; startKey: number; multiplier: number }[],
  selections: Record<string, string[]>,
): Weights {
  const scores: Record<string, number> = {};
  let totalScore = 0;

  for (const { rounds, startKey, multiplier } of allRounds) {
    for (let i = 0; i < rounds.length; i++) {
      const key = String(startKey + i);
      const picked = selections[key] || [];
      for (const filename of picked) {
        const img = rounds[i].find((im) => im.filename === filename);
        if (img) {
          scores[img.aesthetic] = (scores[img.aesthetic] || 0) + multiplier;
          totalScore += multiplier;
        }
      }
    }
  }

  if (totalScore === 0) return {};

  const weights: Weights = {};
  for (const [aes, score] of Object.entries(scores)) {
    weights[aes] = Math.round((score / totalScore) * 100);
  }

  // Fix rounding to sum to 100
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum !== 100 && Object.keys(weights).length > 0) {
    const largest = Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
    weights[largest] += 100 - sum;
  }

  return weights;
}

// --- Component ---

export default function StyleDiscovery({ onChange, initialValue }: StyleDiscoveryProps) {
  const [manifest, setManifest] = useState<PoolManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>(1);
  const [step, setStep] = useState(0); // step within current phase
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [showResults, setShowResults] = useState(false);

  // Built rounds per phase
  const [p1Rounds, setP1Rounds] = useState<DiscoveryImage[][]>([]);
  const [p2Rounds, setP2Rounds] = useState<DiscoveryImage[][]>([]);
  const [p3Rounds, setP3Rounds] = useState<DiscoveryImage[][]>([]);
  const [usedImages, setUsedImages] = useState(new Set<string>());
  const [topFromP1, setTopFromP1] = useState<string[]>([]);
  const [topFromP2, setTopFromP2] = useState<string[]>([]);

  const hasInteractedRef = useRef(false);

  // Restore saved state
  useEffect(() => {
    if (hasInteractedRef.current || !initialValue) return;
    try {
      const parsed: StyleDiscoveryData = JSON.parse(initialValue);
      if (parsed.weights && Object.keys(parsed.weights).length > 0) {
        setShowResults(true);
        setSelections(parsed.selections || {});
        if (parsed.topAesthetics) {
          setTopFromP1(parsed.topAesthetics.slice(0, 6));
          setTopFromP2(parsed.topAesthetics.slice(0, 3));
        }
      }
    } catch {
      // start fresh
    }
  }, [initialValue]);

  // Fetch manifest
  useEffect(() => {
    async function fetchManifest() {
      try {
        const res = await fetch(`${basePath}/api/quiz/manifest`);
        if (!res.ok) throw new Error("Failed to load quiz images");
        const data = await res.json();
        // Support both pool-based and legacy round-based manifests
        if (data.pools) {
          setManifest(data as PoolManifest);
        } else {
          setError("Quiz manifest format not supported. Please regenerate.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    }
    fetchManifest();
  }, []);

  // Build Phase 1 rounds when manifest loads
  useEffect(() => {
    if (!manifest || p1Rounds.length > 0) return;
    const { rounds, used } = buildPhase1(manifest);
    setP1Rounds(rounds);
    setUsedImages(used);
  }, [manifest, p1Rounds.length]);

  // Global key for selections (across all phases)
  const globalKey = useCallback(
    (p: Phase, s: number) => {
      if (p === 1) return String(s);
      if (p === 2) return String(PHASE_1_ROUNDS + s);
      return String(PHASE_1_ROUNDS + PHASE_2_ROUNDS + s);
    },
    [],
  );

  // Notify parent
  const notifyChange = useCallback(
    (sel: Record<string, string[]>) => {
      const allRounds: { rounds: DiscoveryImage[][]; startKey: number; multiplier: number }[] = [];
      if (p1Rounds.length > 0) allRounds.push({ rounds: p1Rounds, startKey: 0, multiplier: 1 });
      if (p2Rounds.length > 0) allRounds.push({ rounds: p2Rounds, startKey: PHASE_1_ROUNDS, multiplier: 2 });
      if (p3Rounds.length > 0) allRounds.push({ rounds: p3Rounds, startKey: PHASE_1_ROUNDS + PHASE_2_ROUNDS, multiplier: 3 });

      const weights = computeFinalWeights(allRounds, sel);
      const topAesthetics = Object.entries(weights)
        .sort((a, b) => b[1] - a[1])
        .map(([aes]) => aes);

      const data: StyleDiscoveryData = { selections: sel, weights, topAesthetics };
      onChange(JSON.stringify(data));
    },
    [onChange, p1Rounds, p2Rounds, p3Rounds],
  );

  // Current phase rounds
  const currentPhaseRounds = phase === 1 ? p1Rounds : phase === 2 ? p2Rounds : p3Rounds;
  const currentPhaseLength = phase === 1 ? PHASE_1_ROUNDS : phase === 2 ? PHASE_2_ROUNDS : PHASE_3_ROUNDS;
  const phaseConfig = PHASE_INFO[phase];

  function toggleImage(filename: string) {
    if (!manifest) return;
    hasInteractedRef.current = true;

    const key = globalKey(phase, step);
    const current = selections[key] || [];
    let next: string[];

    if (current.includes(filename)) {
      next = current.filter((f) => f !== filename);
    } else if (current.length >= phaseConfig.max) {
      // Replace oldest
      next = [...current.slice(1), filename];
    } else {
      next = [...current, filename];
    }

    const updated = { ...selections, [key]: next };
    setSelections(updated);
    notifyChange(updated);
  }

  function handleNext() {
    if (step < currentPhaseLength - 1) {
      // More steps in this phase
      setStep((s) => s + 1);
    } else if (phase === 1) {
      // Transition to Phase 2
      if (!manifest) return;
      const top6 = getTopAesthetics(p1Rounds, selections, 0, 6);
      setTopFromP1(top6);

      if (top6.length < 2) {
        // Not enough selections — skip to results
        setShowResults(true);
        return;
      }

      const { rounds, used } = buildPhase2(manifest, top6, usedImages);
      setP2Rounds(rounds);
      setUsedImages(used);
      setPhase(2);
      setStep(0);
    } else if (phase === 2) {
      // Transition to Phase 3
      if (!manifest) return;
      const top3 = getTopAesthetics(p2Rounds, selections, PHASE_1_ROUNDS, 3);
      setTopFromP2(top3);

      if (top3.length < 2) {
        setShowResults(true);
        return;
      }

      const { rounds, used } = buildPhase3(manifest, top3, usedImages);
      setP3Rounds(rounds);
      setUsedImages(used);
      setPhase(3);
      setStep(0);
    } else {
      // Phase 3 complete — show results
      setShowResults(true);
    }
  }

  function handlePrevious() {
    if (showResults) {
      setShowResults(false);
      return;
    }
    if (step > 0) {
      setStep((s) => s - 1);
    }
    // Don't go back across phases
  }

  function handleRetake() {
    if (!manifest) return;
    setSelections({});
    setPhase(1);
    setStep(0);
    setShowResults(false);
    setP2Rounds([]);
    setP3Rounds([]);
    setTopFromP1([]);
    setTopFromP2([]);

    const { rounds, used } = buildPhase1(manifest);
    setP1Rounds(rounds);
    setUsedImages(used);
    notifyChange({});
  }

  // Sorted weights for results
  const sortedWeights = useMemo(() => {
    const allRounds: { rounds: DiscoveryImage[][]; startKey: number; multiplier: number }[] = [];
    if (p1Rounds.length > 0) allRounds.push({ rounds: p1Rounds, startKey: 0, multiplier: 1 });
    if (p2Rounds.length > 0) allRounds.push({ rounds: p2Rounds, startKey: PHASE_1_ROUNDS, multiplier: 2 });
    if (p3Rounds.length > 0) allRounds.push({ rounds: p3Rounds, startKey: PHASE_1_ROUNDS + PHASE_2_ROUNDS, multiplier: 3 });
    const weights = computeFinalWeights(allRounds, selections);
    return Object.entries(weights).sort((a, b) => b[1] - a[1]);
  }, [selections, p1Rounds, p2Rounds, p3Rounds]);

  // --- Render ---

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
            Based on your selections, here are your top aesthetics.
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

  // Ensure rounds are built
  if (currentPhaseRounds.length === 0) return null;

  const round = currentPhaseRounds[step];
  if (!round) return null;

  const key = globalKey(phase, step);
  const roundSelections = selections[key] || [];
  const canAdvance = roundSelections.length >= phaseConfig.min;

  // Progress across all phases
  const totalSteps = PHASE_1_ROUNDS + PHASE_2_ROUNDS + PHASE_3_ROUNDS;
  const currentGlobalStep =
    (phase === 1 ? step : phase === 2 ? PHASE_1_ROUNDS + step : PHASE_1_ROUNDS + PHASE_2_ROUNDS + step) + 1;
  const progress = (currentGlobalStep / totalSteps) * 100;

  // Phase 3 is head-to-head (2 images side by side, larger)
  const isHeadToHead = phase === 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-zinc-500">
            <span className="text-zinc-400 font-medium">{phaseConfig.label}</span>
            {" · "}Step {currentGlobalStep} of {totalSteps}
          </span>
          <span className="text-sm text-zinc-500">{phaseConfig.instruction}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Image grid */}
      {isHeadToHead ? (
        // Head-to-head: 2 large images side by side
        <div className="grid grid-cols-2 gap-4">
          {round.map((img) => {
            const isSelected = roundSelections.includes(img.filename);
            const imageSrc = `${basePath}/api/images/fashion/looks/images/${img.filename}`;

            return (
              <button
                key={img.filename}
                type="button"
                onClick={() => toggleImage(img.filename)}
                className={`relative rounded-xl overflow-hidden transition-all duration-200 focus:outline-none ${
                  isSelected
                    ? "ring-3 ring-indigo-400 ring-offset-2 ring-offset-zinc-900 scale-[1.02]"
                    : "ring-1 ring-zinc-700 hover:ring-zinc-500"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt="Fashion look"
                  className="w-full aspect-[3/4] object-cover"
                />
                {isSelected && (
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <span className="text-xs font-medium text-white/80">
                    {formatAestheticLabel(img.aesthetic)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        // Regular grid: 2×3 on desktop
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {round.map((img) => {
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
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={phase === 1 && step === 0}
          className="px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canAdvance}
          className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
            !canAdvance
              ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          {phase === 3 && step === PHASE_3_ROUNDS - 1
            ? "See Results"
            : phase < 3 && step === currentPhaseLength - 1
              ? "Continue"
              : "Next"}
        </button>
      </div>
    </div>
  );
}
