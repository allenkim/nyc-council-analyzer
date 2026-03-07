import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const recommendation = await prisma.advisorRecommendation.update({
      where: { id, userId: user.id },
      data: { isDismissed: true, dismissedAt: new Date() },
    });

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("Error dismissing recommendation:", error);
    return NextResponse.json({ error: "Failed to dismiss" }, { status: 500 });
  }
}
