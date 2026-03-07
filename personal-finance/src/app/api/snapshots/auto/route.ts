import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all users who have accounts
    const users = await prisma.user.findMany({
      where: { accounts: { some: {} } },
      select: { id: true },
    });

    const today = startOfDay(new Date());
    let created = 0;

    for (const user of users) {
      // Check if snapshot already exists for today
      const existing = await prisma.snapshot.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: today },
        },
      });

      if (existing) continue;

      const holdings = await prisma.holding.findMany({
        where: { account: { userId: user.id } },
      });

      const netWorth = holdings.reduce((sum, h) => sum + h.value, 0);

      await prisma.snapshot.create({
        data: {
          netWorth,
          userId: user.id,
          holdings: {
            create: holdings.map((h) => ({
              name: h.name,
              category: h.category,
              value: h.value,
            })),
          },
        },
      });

      created++;
    }

    return NextResponse.json({ created, total: users.length });
  } catch (error) {
    console.error("Error creating auto snapshots:", error);
    return NextResponse.json({ error: "Failed to create snapshots" }, { status: 500 });
  }
}
