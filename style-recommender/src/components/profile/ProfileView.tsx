"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ColorSeasonCard } from "./ColorSeasonCard";
import { BrandList } from "./BrandList";
import { MoodBoard } from "./MoodBoard";
import { KeyPiecesList } from "./KeyPiecesList";
import { StyleInspirationStrip } from "./StyleInspirationStrip";

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
  topAesthetics?: string[];
  brandsToExplore?: Array<{
    name: string;
    reason: string;
    priceRange: string;
  }>;
  styleDos?: string[];
  styleDonts?: string[];
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

export function ProfileView({
  userName,
  profileData,
  colorSeason,
  kibbeType,
  styleArchetype,
}: ProfileViewProps) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Use Claude's analysis as primary, fall back to Gemini
  const primary: ProfileData = profileData.claude || profileData.gemini || {};

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
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-400">
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
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-300">
              {primary.archetypeDescription}
            </p>
          )}
        </section>
      )}

      {/* Mood Board */}
      {primary.topAesthetics && primary.topAesthetics.length > 0 && (
        <MoodBoard aesthetics={primary.topAesthetics} />
      )}

      {/* Color Season & Kibbe Type - Two Column */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ColorSeasonCard
          colorSeason={colorSeason}
          colorRecommendations={primary.colorRecommendations}
        />

        {kibbeType && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm">
            <h3 className="mb-1 text-sm font-medium uppercase tracking-wider text-zinc-300">
              Kibbe Body Type
            </h3>
            <p className="mb-4 text-2xl font-bold text-white">{kibbeType}</p>

            {primary.fitRecommendations && (
              <ul className="space-y-2 text-sm text-zinc-300">
                {primary.fitRecommendations.general && (
                  <li className="text-zinc-300">{primary.fitRecommendations.general}</li>
                )}
                {primary.fitRecommendations.tops && (
                  <li><span className="text-zinc-400">Tops: </span>{primary.fitRecommendations.tops}</li>
                )}
                {primary.fitRecommendations.bottoms && (
                  <li><span className="text-zinc-400">Bottoms: </span>{primary.fitRecommendations.bottoms}</li>
                )}
                {primary.fitRecommendations.outerwear && (
                  <li><span className="text-zinc-400">Outerwear: </span>{primary.fitRecommendations.outerwear}</li>
                )}
              </ul>
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
          <KeyPiecesList pieces={primary.keyPieces} />
        </section>
      )}

      {/* Style Do's and Don'ts */}
      {((primary.styleDos && primary.styleDos.length > 0) ||
        (primary.styleDonts && primary.styleDonts.length > 0)) && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-white">
            Style Guidelines
          </h3>
          {primary.topAesthetics && primary.topAesthetics.length > 0 && (
            <StyleInspirationStrip aesthetics={primary.topAesthetics} />
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {primary.styleDos && primary.styleDos.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-400">
                  <span className="text-lg">+</span> Do
                </h4>
                <ul className="space-y-2">
                  {primary.styleDos.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-zinc-300"
                    >
                      <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {primary.styleDonts && primary.styleDonts.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-400">
                  <span className="text-lg">-</span> Don&apos;t
                </h4>
                <ul className="space-y-2">
                  {primary.styleDonts.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-zinc-300"
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

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center">
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
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

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full rounded-xl border border-zinc-700 bg-transparent px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white sm:w-auto"
          >
            Start Over
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Reset everything?</span>
            <button
              onClick={async () => {
                setResetting(true);
                try {
                  await fetch(`${basePath}/api/quiz/reset`, { method: "POST" });
                  router.push("/quiz");
                  router.refresh();
                } catch {
                  setResetting(false);
                  setShowResetConfirm(false);
                }
              }}
              disabled={resetting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {resetting ? "Resetting..." : "Yes, reset"}
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
