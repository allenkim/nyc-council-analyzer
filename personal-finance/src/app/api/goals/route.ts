import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createGoalSchema, updateGoalSchema } from "@/lib/validation";

export async function GET() {
  try {
    const goals = await prisma.financialGoal.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(goals);
  } catch {
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { targetDate, ...rest } = parsed.data;
    const goal = await prisma.financialGoal.create({
      data: {
        ...rest,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });
    return NextResponse.json(goal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { id, targetDate, ...rest } = parsed.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { ...rest };
    if (targetDate !== undefined) {
      data.targetDate = targetDate ? new Date(targetDate) : null;
    }

    const goal = await prisma.financialGoal.update({ where: { id }, data });
    return NextResponse.json(goal);
  } catch {
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await prisma.financialGoal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
}
