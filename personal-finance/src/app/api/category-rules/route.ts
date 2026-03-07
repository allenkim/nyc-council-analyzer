import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createCategoryRuleSchema, updateCategoryRuleSchema } from "@/lib/validation";

export async function GET() {
  try {
    const rules = await prisma.categoryRule.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCategoryRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const rule = await prisma.categoryRule.create({ data: parsed.data });
    return NextResponse.json(rule, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateCategoryRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { id, ...data } = parsed.data;
    const rule = await prisma.categoryRule.update({ where: { id }, data });
    return NextResponse.json(rule);
  } catch {
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await prisma.categoryRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }
}
