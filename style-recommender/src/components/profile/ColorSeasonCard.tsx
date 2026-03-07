"use client";

// 12-type color season system with representative palettes
const COLOR_SEASON_PALETTES: Record<
  string,
  { colors: string[]; description: string; tone: string }
> = {
  "Light Spring": {
    colors: ["#FAD6A5", "#FFDAB9", "#FFB7B2", "#B5EAD7", "#C7CEEA", "#FFFFD8"],
    description:
      "Warm undertone with light, fresh clarity. Think sun-washed pastels and golden warmth.",
    tone: "warm",
  },
  "True Spring": {
    colors: ["#FF6B35", "#FFD700", "#32CD32", "#FF8C00", "#87CEEB", "#FF69B4"],
    description:
      "Pure warm undertone with vivid, clear saturation. Bold, bright, and energetic.",
    tone: "warm",
  },
  "Bright Spring": {
    colors: ["#FF1493", "#00CED1", "#FFD700", "#FF4500", "#00FF7F", "#FF6347"],
    description:
      "Warm-leaning with high contrast and brilliance. Electric, eye-catching combinations.",
    tone: "warm",
  },
  "Light Summer": {
    colors: ["#B0C4DE", "#DDA0DD", "#E6E6FA", "#98D8C8", "#F7CAC9", "#C5B9CD"],
    description:
      "Cool undertone with soft, muted lightness. Dusty pastels and powdery elegance.",
    tone: "cool",
  },
  "True Summer": {
    colors: ["#6B8E9B", "#9B7EA5", "#A2B5CD", "#708090", "#BC8F8F", "#8FBC8F"],
    description:
      "Pure cool undertone with medium depth and soft contrast. Understated sophistication.",
    tone: "cool",
  },
  "Soft Summer": {
    colors: ["#C9B1BD", "#A9B4A5", "#D4C5B9", "#8E9AAF", "#B8B8AA", "#CEC2B0"],
    description:
      "Cool-leaning with a muted, greyed-out quality. Subtle, blended, and calming.",
    tone: "cool",
  },
  "Soft Autumn": {
    colors: ["#C4A882", "#9B8E6E", "#B5A68C", "#8B7D6B", "#C9B99A", "#A69279"],
    description:
      "Warm-leaning with a soft, muted, earthy quality. Organic and naturally elegant.",
    tone: "warm",
  },
  "True Autumn": {
    colors: ["#CD853F", "#8B4513", "#D2691E", "#6B8E23", "#B8860B", "#A0522D"],
    description:
      "Pure warm undertone with rich, earthy depth. Harvest tones and burnished metallics.",
    tone: "warm",
  },
  "Dark Autumn": {
    colors: ["#8B0000", "#4B3621", "#556B2F", "#8B6914", "#704214", "#483C32"],
    description:
      "Warm undertone with deep, intense richness. Dramatic earth tones with gravitas.",
    tone: "warm",
  },
  "Dark Winter": {
    colors: ["#800020", "#191970", "#006400", "#4B0082", "#2F4F4F", "#8B008B"],
    description:
      "Cool-leaning with extreme depth and intensity. Bold, dramatic, and commanding.",
    tone: "cool",
  },
  "True Winter": {
    colors: ["#FF0000", "#0000FF", "#FFFFFF", "#000000", "#FF00FF", "#00FFFF"],
    description:
      "Pure cool undertone with maximum contrast. Icy brights and stark contrasts.",
    tone: "cool",
  },
  "Bright Winter": {
    colors: ["#FF1493", "#4169E1", "#FFD700", "#00FF00", "#FF4500", "#9400D3"],
    description:
      "Cool-leaning with vivid, electric saturation. High-impact and jewel-toned.",
    tone: "cool",
  },
};

interface ColorSeasonCardProps {
  colorSeason: string | null;
  colorRecommendations?: {
    best?: string[];
    avoid?: string[];
    neutrals?: string[];
  };
}

export function ColorSeasonCard({
  colorSeason,
  colorRecommendations,
}: ColorSeasonCardProps) {
  if (!colorSeason) return null;

  const palette = COLOR_SEASON_PALETTES[colorSeason];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm">
      <h3 className="mb-1 text-sm font-medium uppercase tracking-wider text-zinc-400">
        Color Season
      </h3>
      <p className="mb-4 text-2xl font-bold text-white">{colorSeason}</p>

      {palette && (
        <>
          <div className="mb-4 flex gap-2">
            {palette.colors.map((color, i) => (
              <div
                key={i}
                className="h-10 flex-1 rounded-lg shadow-inner"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <p className="mb-4 text-sm leading-relaxed text-zinc-400">
            {palette.description}
          </p>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              palette.tone === "warm"
                ? "bg-amber-900/40 text-amber-300"
                : "bg-sky-900/40 text-sky-300"
            }`}
          >
            {palette.tone === "warm" ? "Warm Undertone" : "Cool Undertone"}
          </span>
        </>
      )}

      {colorRecommendations && (
        <div className="mt-6 space-y-3">
          {colorRecommendations.best && colorRecommendations.best.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Best Colors
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {colorRecommendations.best.map((color, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-emerald-900/30 px-2.5 py-1 text-xs text-emerald-200"
                  >
                    {color}
                  </span>
                ))}
              </div>
            </div>
          )}

          {colorRecommendations.neutrals &&
            colorRecommendations.neutrals.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Neutrals
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {colorRecommendations.neutrals.map((color, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {colorRecommendations.avoid &&
            colorRecommendations.avoid.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-red-400">
                  Colors to Avoid
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {colorRecommendations.avoid.map((color, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-red-900/30 px-2.5 py-1 text-xs text-red-200"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
