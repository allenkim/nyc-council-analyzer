"use client";

const STEPS = ["Body & Fit", "Lifestyle", "Preferences", "Style", "Selfie"];

interface ProgressBarProps {
  currentStep: number;
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="w-full mb-8">
      {/* Step labels + dots */}
      <div className="flex justify-between items-center mb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < currentStep
                  ? "bg-indigo-500 text-white"
                  : i === currentStep
                    ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-900"
                    : "bg-gray-700 text-gray-400"
              }`}
            >
              {i < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`mt-1 text-xs hidden sm:block ${
                i === currentStep ? "text-indigo-400 font-medium" : "text-gray-500"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar track */}
      <div className="relative h-1 bg-gray-700 rounded-full mt-2">
        <div
          className="absolute h-1 bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
