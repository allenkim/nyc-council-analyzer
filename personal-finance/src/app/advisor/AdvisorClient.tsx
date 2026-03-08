"use client";

import { useState, useCallback } from "react";
import ProfileForm from "./ProfileForm";
import RecommendationCard from "./RecommendationCard";
import GenerateButton from "./GenerateButton";
import AddCreditScoreForm from "../insights/AddCreditScoreForm";

export interface Recommendation {
  id: string;
  type: string;
  category: string;
  title: string;
  summary: string;
  details: string | null;
  priority: number;
}

interface CreditScoreData {
  score: number;
  source: string;
  createdAt: string;
}

export interface AllocationData {
  current: {
    domesticStocks: number;
    internationalStocks: number;
    bonds: number;
    cash: number;
  };
  target: {
    domesticStocks: number;
    internationalStocks: number;
    bonds: number;
  };
  investableTotal: number;
  realEstate: number;
  crypto: number;
}

function getCreditRating(score: number) {
  if (score >= 800) return { label: "Exceptional", color: "text-success" };
  if (score >= 740) return { label: "Very Good", color: "text-success" };
  if (score >= 670) return { label: "Good", color: "text-accent" };
  if (score >= 580) return { label: "Fair", color: "text-warning" };
  return { label: "Poor", color: "text-danger" };
}

function AllocationBar({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-accent-light/30 mb-2">
        {segments.map((seg) =>
          seg.pct > 0.5 ? (
            <div
              key={seg.label}
              className={`${seg.color} transition-all duration-500`}
              style={{ width: `${seg.pct}%` }}
              title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs">
            <span className={`w-2 h-2 rounded-full ${seg.color}`} />
            <span className="text-muted">{seg.label}</span>
            <span className="font-medium tabular-nums">{seg.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdvisorClient({
  hasProfile,
  initialRecommendations,
  creditScore,
  previousScore,
  initialAllocation,
}: {
  hasProfile: boolean;
  initialRecommendations: Recommendation[];
  creditScore: CreditScoreData | null;
  previousScore: CreditScoreData | null;
  initialAllocation: AllocationData | null;
}) {
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [allocation, setAllocation] = useState<AllocationData | null>(initialAllocation);

  const handleGenerated = useCallback((data: Record<string, unknown>) => {
    if (data.recommendations && Array.isArray(data.recommendations)) {
      setRecommendations(data.recommendations as Recommendation[]);
    }
    if (data.allocation) {
      setAllocation(data.allocation as AllocationData);
    }
  }, []);

  function handleDismiss(id: string) {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  }

  const topActions = recommendations.filter((r) => r.priority >= 7).slice(0, 3);
  const otherRecs = recommendations.filter((r) => !topActions.includes(r));

  const groupedRecs = new Map<string, Recommendation[]>();
  for (const rec of otherRecs) {
    const group = groupedRecs.get(rec.category) || [];
    group.push(rec);
    groupedRecs.set(rec.category, group);
  }

  const scoreChange = creditScore && previousScore
    ? creditScore.score - previousScore.score
    : null;
  const rating = creditScore ? getCreditRating(creditScore.score) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Advisor</h2>
          <p className="text-muted text-sm mt-1">Boglehead-based financial recommendations</p>
        </div>
        {hasProfile && <GenerateButton onGenerated={handleGenerated} />}
      </div>

      <details open={!hasProfile} className="group">
        <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
          {hasProfile ? "Edit financial profile" : "Set up your financial profile to get started"}
        </summary>
        <div className="mt-3 bg-card border border-card-border rounded-xl p-6">
          <ProfileForm />
        </div>
      </details>

      {allocation && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h3 className="text-sm font-medium text-muted mb-4">Portfolio Allocation</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Current</p>
              <AllocationBar
                segments={[
                  { label: "US Stocks", pct: allocation.current.domesticStocks, color: "bg-accent" },
                  { label: "Intl Stocks", pct: allocation.current.internationalStocks, color: "bg-blue-400" },
                  { label: "Bonds", pct: allocation.current.bonds, color: "bg-emerald-500" },
                  { label: "Cash", pct: allocation.current.cash, color: "bg-amber-400" },
                ]}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Target</p>
              <AllocationBar
                segments={[
                  { label: "US Stocks", pct: allocation.target.domesticStocks, color: "bg-accent" },
                  { label: "Intl Stocks", pct: allocation.target.internationalStocks, color: "bg-blue-400" },
                  { label: "Bonds", pct: allocation.target.bonds, color: "bg-emerald-500" },
                ]}
              />
            </div>
          </div>
          <p className="text-xs text-muted mt-4">
            Investable portfolio: ${Math.round(allocation.investableTotal).toLocaleString()}
            {allocation.realEstate > 0 && <> &middot; Real estate: ${Math.round(allocation.realEstate).toLocaleString()}</>}
            {allocation.crypto > 0 && <> &middot; Crypto: ${Math.round(allocation.crypto).toLocaleString()}</>}
          </p>
        </div>
      )}

      {topActions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted">Top Actions</h3>
          {topActions.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} onDismiss={handleDismiss} />
          ))}
        </div>
      )}

      {Array.from(groupedRecs.entries()).map(([category, recs]) => (
        <details key={category} className="group">
          <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors flex items-center gap-2">
            {category}
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-light">{recs.length}</span>
          </summary>
          <div className="mt-3 space-y-3">
            {recs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} onDismiss={handleDismiss} />
            ))}
          </div>
        </details>
      ))}

      {hasProfile && recommendations.length === 0 && (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <p className="text-muted text-sm">No recommendations yet. Click &quot;Generate Advice&quot; to get personalized financial insights.</p>
        </div>
      )}

      <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-medium text-muted">Credit Score</h3>
        {creditScore ? (
          <div className="flex items-baseline gap-3 mb-4">
            <span className={`text-4xl font-bold ${rating?.color}`}>{creditScore.score}</span>
            <span className={`text-sm font-medium ${rating?.color}`}>{rating?.label}</span>
            {scoreChange !== null && scoreChange !== 0 && (
              <span className={`text-sm ${scoreChange > 0 ? "text-success" : "text-danger"}`}>
                {scoreChange > 0 ? "+" : ""}{scoreChange} pts
              </span>
            )}
          </div>
        ) : (
          <p className="text-muted text-sm mb-4">No credit score recorded yet.</p>
        )}
        <AddCreditScoreForm />
      </div>
    </div>
  );
}
