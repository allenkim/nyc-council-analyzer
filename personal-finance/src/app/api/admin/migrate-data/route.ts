import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

/**
 * One-time migration endpoint: assigns all records with null userId
 * to the currently authenticated user. Call this once after first sign-in
 * to claim existing data.
 *
 * POST /api/admin/migrate-data
 */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results: Record<string, number> = {};

  const tables = [
    { name: "account", model: prisma.account },
    { name: "plaidItem", model: prisma.plaidItem },
    { name: "snapTradeConnection", model: prisma.snapTradeConnection },
    { name: "budgetGoal", model: prisma.budgetGoal },
    { name: "bill", model: prisma.bill },
    { name: "creditScore", model: prisma.creditScore },
    { name: "financialGoal", model: prisma.financialGoal },
    { name: "categoryRule", model: prisma.categoryRule },
    { name: "insight", model: prisma.insight },
    { name: "snapshot", model: prisma.snapshot },
  ] as const;

  for (const { name, model } of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (model as any).updateMany({
      where: { userId: null },
      data: { userId: user.id },
    });
    results[name] = result.count;
  }

  return NextResponse.json({ migrated: results });
}
