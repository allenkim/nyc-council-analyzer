import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { format } from "date-fns";
import GenerateInsightsButton from "./GenerateInsightsButton";
import InsightCard from "./InsightCard";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const insights = await prisma.insight.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = insights.filter((i) => !i.isRead).length;

  // Group by type
  const alerts = insights.filter(
    (i) => i.severity === "ALERT" || i.severity === "WARNING"
  );
  const info = insights.filter((i) => i.severity === "INFO");

  // Get credit score
  const creditScore = await prisma.creditScore.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const previousScore = await prisma.creditScore.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    skip: 1,
  });

  const scoreChange =
    creditScore && previousScore ? creditScore.score - previousScore.score : 0;

  let creditRating = "Unknown";
  if (creditScore) {
    if (creditScore.score >= 800) creditRating = "Exceptional";
    else if (creditScore.score >= 740) creditRating = "Very Good";
    else if (creditScore.score >= 670) creditRating = "Good";
    else if (creditScore.score >= 580) creditRating = "Fair";
    else creditRating = "Poor";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Insights</h2>
          <p className="text-muted text-sm mt-1">
            AI-powered spending analysis and alerts
          </p>
        </div>
        <GenerateInsightsButton />
      </div>

      {/* Credit Score Card */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-muted">Credit Score</h3>
            {creditScore ? (
              <>
                <p className="text-4xl font-bold mt-2">{creditScore.score}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-sm font-medium ${
                      creditRating === "Exceptional" || creditRating === "Very Good"
                        ? "text-success"
                        : creditRating === "Good"
                        ? "text-accent"
                        : creditRating === "Fair"
                        ? "text-warning"
                        : "text-danger"
                    }`}
                  >
                    {creditRating}
                  </span>
                  {scoreChange !== 0 && (
                    <span
                      className={`text-xs ${
                        scoreChange > 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {scoreChange > 0 ? "+" : ""}
                      {scoreChange} pts
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-2">
                  Updated {format(creditScore.createdAt, "MMM d, yyyy")}
                </p>
              </>
            ) : (
              <p className="text-muted text-sm mt-2">No credit score recorded</p>
            )}
          </div>
          <AddCreditScoreForm />
        </div>
      </div>

      {/* Summary */}
      {unreadCount > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <p className="text-sm font-medium text-warning">
            You have {unreadCount} unread insight{unreadCount > 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Alerts section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted">Alerts & Warnings</h3>
          <div className="space-y-2">
            {alerts.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Info section */}
      {info.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted">Summaries & Info</h3>
          <div className="space-y-2">
            {info.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {insights.length === 0 && (
        <div className="bg-card border border-card-border rounded-xl p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">No insights yet</p>
          <p className="text-muted text-sm">
            Click &quot;Generate Insights&quot; to get AI-powered analysis of your spending patterns.
          </p>
        </div>
      )}
    </div>
  );
}

function AddCreditScoreForm() {
  return <AddCreditScoreFormClient />;
}

import AddCreditScoreFormClient from "./AddCreditScoreForm";
