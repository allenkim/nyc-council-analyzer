import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHoldingSchema, updateHoldingSchema } from "@/lib/validation";
import { computeGainLoss } from "@/lib/holdings";
import { getUser } from "@/lib/session";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const holdings = await prisma.holding.findMany({
    where: { account: { userId: user.id } },
    include: {
      account: true,
      costBasis: true,
    },
    orderBy: { value: "desc" },
  });

  const holdingsWithPerformance = holdings.map(computeGainLoss);

  return NextResponse.json(holdingsWithPerformance);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createHoldingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { accountId, name, category, quantity, price, ticker, costBasisPrice, purchaseDate } = parsed.data;

    // Verify account belongs to user
    const account = await prisma.account.findFirst({ where: { id: accountId, userId: user.id } });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const holding = await prisma.holding.create({
      data: {
        accountId,
        name,
        ticker: ticker || null,
        category,
        quantity,
        price,
        value: quantity * price,
      },
    });

    // Create initial cost basis entry if costBasisPrice is provided
    if (costBasisPrice !== undefined && costBasisPrice !== null) {
      await prisma.costBasis.create({
        data: {
          holdingId: holding.id,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          purchasePrice: costBasisPrice,
          quantity,
        },
      });
    }

    return NextResponse.json(holding, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create holding" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = updateHoldingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { id, name, category, quantity, price, ticker } = parsed.data;

    const holding = await prisma.holding.update({
      where: { id, account: { userId: user.id } },
      data: {
        name,
        ticker: ticker || null,
        category,
        quantity,
        price,
        value: quantity * price,
      },
    });
    return NextResponse.json(holding);
  } catch {
    return NextResponse.json({ error: "Failed to update holding" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await prisma.holding.delete({ where: { id, account: { userId: user.id } } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }
}
