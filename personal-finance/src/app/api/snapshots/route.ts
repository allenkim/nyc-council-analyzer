import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshots = await prisma.snapshot.findMany({
    where: { userId: user.id },
    include: { holdings: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(snapshots);
}

export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const holdings = await prisma.holding.findMany({
      where: { account: { userId: user.id } },
    });
    const netWorth = holdings.reduce((sum, h) => sum + h.value, 0);

    const snapshot = await prisma.snapshot.create({
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
      include: { holdings: true },
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create snapshot" }, { status: 500 });
  }
}
