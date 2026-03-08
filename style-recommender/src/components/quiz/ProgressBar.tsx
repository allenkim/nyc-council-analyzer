"use client";

const STEPS = ["Body & Fit", "Lifestyle", "Preferences", "Style", "Photos"];

interface ProgressBarProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

export default function ProgressBar({ currentStep, completedSteps, onStepClick }: ProgressBarProps) {
  return (
    <div className="w-full mb-8">
      {/* Step labels + dots */}
      <div className="flex justify-between items-center mb-2">
        {STEPS.map((label, i) => {
          const isCompleted = completedSteps.has(i);
          const isClickable = isCompleted || i <= currentStep;

          return (
            <div key={label} className="flex flex-col items-center flex-1">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(i)}
                disabled={!isClickable}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i < currentStep || isCompleted
                    ? "bg-indigo-500 text-white cursor-pointer hover:bg-indigo-400"
                    : i === currentStep
                      ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-900"
                      : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                }`}
              >
                {isCompleted && i !== currentStep ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </button>
              <span
                className={`mt-1 text-xs hidden sm:block ${
                  i === currentStep
                    ? "text-indigo-400 font-medium"
                    : isClickable
                      ? "text-zinc-400 cursor-pointer"
                      : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar track */}
      <div className="relative h-1 bg-zinc-700 rounded-full mt-2">
        <div
          className="absolute h-1 bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
