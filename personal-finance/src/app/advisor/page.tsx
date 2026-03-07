import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import AdvisorClient from "./AdvisorClient";

export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [profile, recommendations, creditScores] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: user.id } }),
    prisma.advisorRecommendation.findMany({
      where: { userId: user.id, isDismissed: false },
      orderBy: { priority: "desc" },
    }),
    prisma.creditScore.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  ]);

  const latestScore = creditScores[0]
    ? { score: creditScores[0].score, source: creditScores[0].source, createdAt: creditScores[0].createdAt.toISOString() }
    : null;
  const prevScore = creditScores[1]
    ? { score: creditScores[1].score, source: creditScores[1].source, createdAt: creditScores[1].createdAt.toISOString() }
    : null;

  return (
    <AdvisorClient
      hasProfile={!!profile}
      initialRecommendations={recommendations}
      creditScore={latestScore}
      previousScore={prevScore}
    />
  );
}
