"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { QUIZ_SECTIONS, type QuizCategory } from "@/lib/quiz-definitions";
import ProgressBar from "./ProgressBar";
import QuizSection from "./QuizSection";
import SelfieUpload from "./SelfieUpload";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** All quiz section categories in order */
const SECTION_CATEGORIES: QuizCategory[] = QUIZ_SECTIONS.map((s) => s.category);
/** Total steps = quiz sections + selfie */
const TOTAL_STEPS = SECTION_CATEGORIES.length + 1;

type QuizAnswers = Record<string, Record<string, string | string[]>>;

interface QuizFlowProps {
  initialAnswers: QuizAnswers;
  initialSelfieCount: number;
}

/** Find the first quiz section without answers, or the selfie step if all are filled */
function findInitialStep(answers: QuizAnswers): number {
  for (let i = 0; i < SECTION_CATEGORIES.length; i++) {
    const cat = SECTION_CATEGORIES[i];
    if (!answers[cat] || Object.keys(answers[cat]).length === 0) return i;
  }
  // All quiz sections have answers — go to selfie step
  return SECTION_CATEGORIES.length;
}

export default function QuizFlow({ initialAnswers, initialSelfieCount }: QuizFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(() =>
    findInitialStep(initialAnswers)
  );
  const [answers, setAnswers] = useState<QuizAnswers>(initialAnswers);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selfieCount, setSelfieCount] = useState(initialSelfieCount);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleSelfieCountChange = useCallback((count: number, analyzed: number) => {
    setSelfieCount(count);
    setAnalyzedCount(analyzed);
  }, []);

  // Track which steps have answers (for progress bar)
  const completedSteps = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < SECTION_CATEGORIES.length; i++) {
      const cat = SECTION_CATEGORIES[i];
      if (answers[cat] && Object.keys(answers[cat]).length > 0) {
        set.add(i);
      }
    }
    // Mark selfie step as completed if there are selfies
    if (selfieCount > 0) {
      set.add(SECTION_CATEGORIES.length);
    }
    return set;
  }, [answers, selfieCount]);

  const isSelfieStep = currentStep === SECTION_CATEGORIES.length;
  const section = !isSelfieStep ? QUIZ_SECTIONS[currentStep] : null;
  const category = section?.category;
  const sectionAnswers = category ? answers[category] || {} : {};

  function handleAnswerChange(questionId: string, value: string | string[]) {
    if (!category) return;
    setAnswers((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [questionId]: value,
      },
    }));
  }

  async function saveSection(cat: QuizCategory) {
    const sectionData = answers[cat] || {};
    // Only save if there are answers
    if (Object.keys(sectionData).length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat, answers: sectionData }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save section");
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (isSelfieStep) return;
    // Save current section then advance
    if (category) {
      await saveSection(category);
    }
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  async function handleStepClick(step: number) {
    if (step === currentStep) return;
    // Save current section before jumping
    if (!isSelfieStep && category) {
      await saveSection(category);
    }
    setCurrentStep(step);
  }

  async function handleGenerateProfile() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/profile`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate profile");
      }
      // Redirect to profile page immediately — it will handle the waiting
      router.push("/profile");
    } catch (err) {
      setGenerating(false);
      setError(err instanceof Error ? err.message : "Failed to generate profile");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Section header */}
      {section && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-100">{section.title}</h2>
          <p className="text-zinc-400 mt-1">{section.description}</p>
        </div>
      )}

      {isSelfieStep && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-100">Photo Analysis</h2>
          <p className="text-zinc-400 mt-1">
            Optional: upload photos for AI-powered color and body analysis.
          </p>
        </div>
      )}

      {/* Quiz section or selfie upload */}
      {section && (
        <QuizSection
          questions={section.questions}
          answers={sectionAnswers}
          onChange={handleAnswerChange}
        />
      )}

      {isSelfieStep && (
        <SelfieUpload
          onSelfieCountChange={handleSelfieCountChange}
        />
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          Back
        </button>

        <div className="flex gap-3">
          {!isSelfieStep && (
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? "Saving..." : "Next"}
            </button>
          )}

          {isSelfieStep && (
            <button
              type="button"
              onClick={handleGenerateProfile}
              disabled={generating}
              className="px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Redirecting...
                </span>
              ) : selfieCount > 0 ? (
                `Generate Profile${analyzedCount < selfieCount ? " (some photos still analyzing)" : ""}`
              ) : (
                "Skip Photos & Generate Profile"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
