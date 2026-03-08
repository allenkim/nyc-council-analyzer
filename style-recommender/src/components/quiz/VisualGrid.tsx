"use client";

interface VisualGridOption {
  label: string;
  value: string;
  imageQuery?: string;
}

interface VisualGridProps {
  questionId: string;
  options: VisualGridOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function VisualGrid({ questionId, options, selected, onChange }: VisualGridProps) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        const imageKey = `${questionId}_${option.value}`;
        const imageSrc = `${basePath}/api/images/quiz-assets/${imageKey}.jpg`;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={`group relative rounded-xl overflow-hidden transition-all duration-200 focus:outline-none ${
              isSelected
                ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-900 scale-[1.02]"
                : "ring-1 ring-zinc-700 hover:ring-zinc-500"
            }`}
          >
            {/* Image */}
            <div className="w-full h-[200px] sm:h-[250px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={option.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Label bar */}
            <div
              className={`px-3 py-2.5 text-sm font-medium text-center transition-colors ${
                isSelected
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-300 group-hover:bg-zinc-700"
              }`}
            >
              {option.label}
            </div>

            {/* Selection checkmark */}
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
  );
}
