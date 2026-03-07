import Link from "next/link";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const features = [
  {
    title: "Style Quiz",
    description:
      "Answer questions about your body, lifestyle, and preferences. Upload a selfie for AI-powered color and body-type analysis.",
    href: "/quiz",
    icon: "Q",
    iconColor: "bg-violet-900/40 text-violet-300 border-violet-800",
  },
  {
    title: "Style Profile",
    description:
      "Get your style archetype, color season, Kibbe body type, wardrobe essentials, and brand recommendations.",
    href: "/profile",
    icon: "P",
    iconColor: "bg-emerald-900/40 text-emerald-300 border-emerald-800",
  },
  {
    title: "Discover Feed",
    description:
      "Browse AI-curated clothing and outfit picks tailored to your profile. Save and heart your favorites.",
    href: "/discover",
    icon: "D",
    iconColor: "bg-sky-900/40 text-sky-300 border-sky-800",
  },
  {
    title: "Outfit Check",
    description:
      "Upload an outfit photo and get instant feedback from two AI models on fit, color harmony, and styling.",
    href: "/check",
    icon: "C",
    iconColor: "bg-amber-900/40 text-amber-300 border-amber-800",
  },
];

export default async function StyleHome() {
  const user = await getUser();

  let hasProfile = false;
  let styleArchetype: string | null = null;
  let colorSeason: string | null = null;

  if (user) {
    const profile = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { styleArchetype: true, colorSeason: true, mergedProfile: true },
    });

    if (profile?.mergedProfile) {
      hasProfile = true;
      styleArchetype = profile.styleArchetype;
      colorSeason = profile.colorSeason;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Your AI-Powered Personal Stylist
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-400">
          Discover your style archetype, get personalized recommendations, and
          check your outfits — all powered by dual AI analysis.
        </p>
      </div>

      {/* Profile Summary or Get Started CTA */}
      {hasProfile ? (
        <section className="mb-12 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 p-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
            Your Style Archetype
          </p>
          <h2 className="mb-2 text-3xl font-bold text-white sm:text-4xl">
            {styleArchetype || "Defined"}
          </h2>
          {colorSeason && (
            <p className="mb-6 text-sm text-zinc-400">
              Color Season:{" "}
              <span className="font-medium text-zinc-200">{colorSeason}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              View Full Profile
            </Link>
            <Link
              href="/discover"
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Discover Picks
            </Link>
            <Link
              href="/check"
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Check an Outfit
            </Link>
          </div>
        </section>
      ) : (
        <section className="mb-12 text-center">
          <Link
            href="/quiz"
            className="inline-block rounded-2xl bg-white px-8 py-4 text-lg font-bold text-black transition-opacity hover:opacity-90"
          >
            Get Started — Take the Style Quiz
          </Link>
          <p className="mt-3 text-sm text-zinc-500">
            Takes about 5 minutes. No account needed beyond your login.
          </p>
        </section>
      )}

      {/* Features Grid */}
      <section>
        <h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-zinc-500">
          What You Can Do
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold ${feature.iconColor}`}
                >
                  {feature.icon}
                </span>
                <h4 className="text-base font-semibold text-white group-hover:text-zinc-100">
                  {feature.title}
                </h4>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
