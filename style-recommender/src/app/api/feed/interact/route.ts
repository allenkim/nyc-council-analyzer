import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

// POST — record a feed interaction (heart, skip, save)
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { feedItemId, action } = await request.json();

    if (!feedItemId || !["heart", "skip", "save"].includes(action)) {
      return NextResponse.json({ error: "feedItemId and valid action required" }, { status: 400 });
    }

    // Verify the feed item belongs to this user
    const feedItem = await prisma.feedItem.findFirst({
      where: { id: feedItemId, userId: user.id },
    });

    if (!feedItem) {
      return NextResponse.json({ error: "Feed item not found" }, { status: 404 });
    }

    const interaction = await prisma.feedInteraction.upsert({
      where: { userId_feedItemId: { userId: user.id, feedItemId } },
      update: { action },
      create: { userId: user.id, feedItemId, action },
    });

    return NextResponse.json(interaction);
  } catch (error) {
    console.error("Error recording interaction:", error);
    return NextResponse.json({ error: "Failed to record interaction" }, { status: 500 });
  }
}
