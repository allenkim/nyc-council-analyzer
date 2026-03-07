import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createCostBasisSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
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

    const holding = await prisma.holding.findUnique({ where: { id: holdingId } });
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
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await prisma.costBasis.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Cost basis entry not found" }, { status: 404 });
  }
}
