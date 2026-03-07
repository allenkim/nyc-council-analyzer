import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import GoalCard from "./GoalCard";
import AddGoalForm from "./AddGoalForm";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const goals = await prisma.financialGoal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount);
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Goals</h2>
        <p className="text-muted text-sm mt-1">
          Track progress towards your financial goals
        </p>
      </div>

      <AddGoalForm />

      {activeGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted">
            Active Goals ({activeGoals.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={{
                  ...goal,
                  targetDate: goal.targetDate?.toISOString() ?? null,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-success">
            Completed ({completedGoals.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={{
                  ...goal,
                  targetDate: goal.targetDate?.toISOString() ?? null,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <div className="bg-card border border-card-border rounded-xl p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">No goals yet</p>
          <p className="text-muted text-sm">
            Set savings targets, debt payoff goals, or investment milestones above.
          </p>
        </div>
      )}
    </div>
  );
}
