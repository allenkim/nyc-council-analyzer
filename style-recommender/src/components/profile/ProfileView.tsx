"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ColorSeasonCard } from "./ColorSeasonCard";
import { BrandList } from "./BrandList";

interface ProfileData {
  styleArchetype?: string;
  archetypeDescription?: string;
  colorRecommendations?: {
    best?: string[];
    avoid?: string[];
    neutrals?: string[];
  };
  fitRecommendations?: {
    tops?: string;
    bottoms?: string;
    outerwear?: string;
    general?: string;
  };
  keyPieces?: Array<{
    item: string;
    description: string;
    priority: "essential" | "recommended" | "nice-to-have";
  }>;
  brandsToExplore?: Array<{
    name: string;
    reason: string;
    priceRange: string;
  }>;
  styleDos?: string[];
  styleDonts?: string[];
  accessories?: Array<{
    type: string;
    recommendation: string;
  }>;
}

interface ProfileViewProps {
  userName: string;
  profileData: {
    claude?: ProfileData;
    gemini?: ProfileData;
  };
  colorSeason: string | null;
  kibbeType: string | null;
  styleArchetype: string | null;
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

function priorityBadge(priority: string) {
  switch (priority) {
    case "essential":
      return "bg-emerald-900/40 text-emerald-300 border-emerald-800";
    case "recommended":
      return "bg-sky-900/40 text-sky-300 border-sky-800";
    case "nice-to-have":
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
    default:
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
}

export function ProfileView({
  userName,
  profileData,
  colorSeason,
  kibbeType,
  styleArchetype,
}: ProfileViewProps) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  // Use Claude's analysis as primary, fall back to Gemini
  const primary: ProfileData = profileData.claude || profileData.gemini || {};
  const secondary: ProfileData | undefined = profileData.claude
    ? profileData.gemini
    : undefined;

  const hasBothModels = !!(profileData.claude && profileData.gemini);

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      const response = await fetch(`${basePath}/api/profile/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `style-profile-${userName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
          Style Profile for
        </p>
        <h1 className="mb-2 text-lg font-medium text-zinc-300">{userName}</h1>
      </header>

      {/* Style Archetype - Hero Section */}
      {(styleArchetype || primary.styleArchetype) && (
        <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 p-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-400">
            Your Style Archetype
          </p>
          <h2 className="mb-3 text-4xl font-bold text-white sm:text-5xl">
            {styleArchetype || primary.styleArchetype}
          </h2>
          {primary.archetypeDescription && (
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400">
              {primary.archetypeDescription}
            </p>
          )}
        </section>
      )}

      {/* Color Season & Kibbe Type - Two Column */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ColorSeasonCard
          colorSeason={colorSeason}
          colorRecommendations={primary.colorRecommendations}
        />

        {kibbeType && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm">
            <h3 className="mb-1 text-sm font-medium uppercase tracking-wider text-zinc-400">
              Kibbe Body Type
            </h3>
            <p className="mb-4 text-2xl font-bold text-white">{kibbeType}</p>

            {primary.fitRecommendations && (
              <div className="space-y-3">
                {primary.fitRecommendations.general && (
                  <p className="text-sm leading-relaxed text-zinc-400">
                    {primary.fitRecommendations.general}
                  </p>
                )}
                {primary.fitRecommendations.tops && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Tops
                    </h4>
                    <p className="text-sm text-zinc-300">
                      {primary.fitRecommendations.tops}
                    </p>
                  </div>
                )}
                {primary.fitRecommendations.bottoms && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Bottoms
                    </h4>
                    <p className="text-sm text-zinc-300">
                      {primary.fitRecommendations.bottoms}
                    </p>
                  </div>
                )}
                {primary.fitRecommendations.outerwear && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Outerwear
                    </h4>
                    <p className="text-sm text-zinc-300">
                      {primary.fitRecommendations.outerwear}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Brands to Explore */}
      {primary.brandsToExplore && primary.brandsToExplore.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-white">
            Brands to Explore
          </h3>
          <BrandList brands={primary.brandsToExplore} />
        </section>
      )}

      {/* Key Pieces / Wardrobe Essentials */}
      {primary.keyPieces && primary.keyPieces.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-white">
            Wardrobe Essentials
          </h3>
          <div className="space-y-2">
            {primary.keyPieces.map((piece, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityBadge(piece.priority)}`}
                >
                  {piece.priority}
                </span>
                <div>
                  <h4 className="font-medium text-white">{piece.item}</h4>
                  <p className="mt-0.5 text-sm text-zinc-400">
                    {piece.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Style Do's and Don'ts */}
      {((primary.styleDos && primary.styleDos.length > 0) ||
        (primary.styleDonts && primary.styleDonts.length > 0)) && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-white">
            Style Guidelines
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {primary.styleDos && primary.styleDos.length > 0 && (
              <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-5">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-400">
                  <span className="text-lg">+</span> Do
                </h4>
                <ul className="space-y-2">
                  {primary.styleDos.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-emerald-100/80"
                    >
                      <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {primary.styleDonts && primary.styleDonts.length > 0 && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-5">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-400">
                  <span className="text-lg">-</span> Don&apos;t
                </h4>
                <ul className="space-y-2">
                  {primary.styleDonts.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-red-100/80"
                    >
                      <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Accessories */}
      {primary.accessories && primary.accessories.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-white">
            Accessory Recommendations
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {primary.accessories.map((acc, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <h4 className="mb-1 text-sm font-semibold text-zinc-300">
                  {acc.type}
                </h4>
                <p className="text-sm text-zinc-400">{acc.recommendation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Claude vs Gemini Comparison */}
      {hasBothModels && secondary && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-white">
            AI Analysis Comparison
          </h3>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="mb-4 text-sm text-zinc-500">
              Your profile was analyzed by both Claude and Gemini. Here is
              where they agreed and diverged.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Claude Column */}
              <div>
                <h4 className="mb-3 rounded-lg bg-violet-900/20 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-violet-400">
                  Claude
                </h4>
                <div className="space-y-2 text-sm">
                  {primary.styleArchetype && (
                    <div>
                      <span className="text-zinc-500">Archetype: </span>
                      <span className="text-zinc-200">
                        {primary.styleArchetype}
                      </span>
                    </div>
                  )}
                  {primary.styleDos && primary.styleDos.length > 0 && (
                    <div>
                      <span className="text-zinc-500">Top tip: </span>
                      <span className="text-zinc-200">
                        {primary.styleDos[0]}
                      </span>
                    </div>
                  )}
                  {primary.brandsToExplore &&
                    primary.brandsToExplore.length > 0 && (
                      <div>
                        <span className="text-zinc-500">Top brands: </span>
                        <span className="text-zinc-200">
                          {primary.brandsToExplore
                            .slice(0, 3)
                            .map((b) => b.name)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                </div>
              </div>

              {/* Gemini Column */}
              <div>
                <h4 className="mb-3 rounded-lg bg-sky-900/20 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Gemini
                </h4>
                <div className="space-y-2 text-sm">
                  {secondary.styleArchetype && (
                    <div>
                      <span className="text-zinc-500">Archetype: </span>
                      <span className="text-zinc-200">
                        {secondary.styleArchetype}
                      </span>
                    </div>
                  )}
                  {secondary.styleDos && secondary.styleDos.length > 0 && (
                    <div>
                      <span className="text-zinc-500">Top tip: </span>
                      <span className="text-zinc-200">
                        {secondary.styleDos[0]}
                      </span>
                    </div>
                  )}
                  {secondary.brandsToExplore &&
                    secondary.brandsToExplore.length > 0 && (
                      <div>
                        <span className="text-zinc-500">Top brands: </span>
                        <span className="text-zinc-200">
                          {secondary.brandsToExplore
                            .slice(0, 3)
                            .map((b) => b.name)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Agreement check */}
            {primary.styleArchetype &&
              secondary.styleArchetype &&
              primary.styleArchetype.toLowerCase() ===
                secondary.styleArchetype.toLowerCase() && (
                <p className="mt-4 rounded-lg bg-emerald-900/20 px-4 py-2 text-center text-sm text-emerald-400">
                  Both models agree on your style archetype &mdash; high
                  confidence result.
                </p>
              )}
            {primary.styleArchetype &&
              secondary.styleArchetype &&
              primary.styleArchetype.toLowerCase() !==
                secondary.styleArchetype.toLowerCase() && (
                <p className="mt-4 rounded-lg bg-amber-900/20 px-4 py-2 text-center text-sm text-amber-400">
                  The models identified different archetypes, suggesting your
                  style spans multiple categories.
                </p>
              )}
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center">
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {downloading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
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
              Generating PDF...
            </>
          ) : (
            "Download PDF"
          )}
        </button>

        <button
          onClick={() => router.push(`${basePath}/quiz`)}
          className="w-full rounded-xl border border-zinc-700 bg-transparent px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white sm:w-auto"
        >
          Retake Quiz
        </button>
      </div>
    </div>
  );
}
