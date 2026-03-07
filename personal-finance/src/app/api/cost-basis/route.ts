import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createCostBasisSchema } from "@/lib/validation";
import { getUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createCostBasisSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { holdingId, purchaseDate, purchasePrice, quantity } = parsed.data;

    const holding = await prisma.holding.findFirst({ where: { id: holdingId, account: { userId: user.id } } });
    if (!holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    const costBasis = await prisma.costBasis.create({
      data: {
        holdingId,
        purchaseDate: new Date(purchaseDate),
        purchasePrice,
        quantity,
      },
    });

    return NextResponse.json(costBasis, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create cost basis entry" }, { status: 500 });
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
    await prisma.costBasis.delete({ where: { id, holding: { account: { userId: user.id } } } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Cost basis entry not found" }, { status: 404 });
  }
}
