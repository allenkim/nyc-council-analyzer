import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { categorizeAllocation, getTargetAllocation } from "@/lib/advisor";
import AdvisorClient from "./AdvisorClient";

export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [profile, recommendations, creditScores, holdings] = await Promise.all([
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
    prisma.holding.findMany({
      where: { account: { userId: user.id } },
      select: { category: true, value: true, name: true, ticker: true },
    }),
  ]);

  const latestScore = creditScores[0]
    ? { score: creditScores[0].score, source: creditScores[0].source, createdAt: creditScores[0].createdAt.toISOString() }
    : null;
  const prevScore = creditScores[1]
    ? { score: creditScores[1].score, source: creditScores[1].source, createdAt: creditScores[1].createdAt.toISOString() }
    : null;

  // Compute allocation summary for initial render
  let allocationData = null;
  if (profile && holdings.length > 0) {
    const allocation = categorizeAllocation(holdings);
    const target = getTargetAllocation(profile.age, profile.riskTolerance);
    const inv = allocation.investableTotal;
    if (inv > 0) {
      allocationData = {
        current: {
          domesticStocks: (allocation.domesticStocks / inv) * 100,
          internationalStocks: (allocation.internationalStocks / inv) * 100,
          bonds: (allocation.bonds / inv) * 100,
          cash: (allocation.cash / inv) * 100,
        },
        target,
        investableTotal: inv,
        realEstate: allocation.realEstate,
        crypto: allocation.crypto,
      };
    }
  }

  return (
    <AdvisorClient
      hasProfile={!!profile}
      initialRecommendations={recommendations}
      creditScore={latestScore}
      previousScore={prevScore}
      initialAllocation={allocationData}
    />
  );
}
