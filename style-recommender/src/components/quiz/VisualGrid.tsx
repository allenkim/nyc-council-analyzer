"use client";

interface VisualGridOption {
  label: string;
  value: string;
  imageQuery?: string;
}

interface VisualGridProps {
  options: VisualGridOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/**
 * Deterministic color from a string value for placeholder visuals.
 */
function placeholderColor(value: string): string {
  const colors = [
    "from-indigo-600 to-purple-700",
    "from-emerald-600 to-teal-700",
    "from-amber-600 to-orange-700",
    "from-rose-600 to-pink-700",
    "from-cyan-600 to-blue-700",
    "from-violet-600 to-fuchsia-700",
    "from-lime-600 to-green-700",
    "from-red-600 to-rose-700",
    "from-sky-600 to-indigo-700",
    "from-teal-600 to-cyan-700",
    "from-fuchsia-600 to-purple-700",
    "from-orange-600 to-amber-700",
  ];
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function VisualGrid({ options, selected, onChange }: VisualGridProps) {
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
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={`group relative rounded-xl overflow-hidden transition-all duration-200 focus:outline-none ${
              isSelected
                ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-900 scale-[1.02]"
                : "ring-1 ring-gray-700 hover:ring-gray-500"
            }`}
          >
            {/* Placeholder image area */}
            <div
              className={`w-full h-[200px] sm:h-[250px] bg-gradient-to-br ${placeholderColor(option.value)} flex items-center justify-center`}
            >
              <span className="text-white/70 text-sm text-center px-3 font-light leading-snug">
                {option.imageQuery || option.label}
              </span>
            </div>

            {/* Label bar */}
            <div
              className={`px-3 py-2.5 text-sm font-medium text-center transition-colors ${
                isSelected
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-300 group-hover:bg-gray-700"
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
