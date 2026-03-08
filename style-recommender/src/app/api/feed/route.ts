import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { FEED_GENERATION_PROMPT } from "@/lib/prompts";

// GET — fetch user's feed items (unseen first, then saved)
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Items user hasn't interacted with yet
    const unseenItems = await prisma.feedItem.findMany({
      where: {
        userId: user.id,
        interactions: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Saved items
    const savedItems = await prisma.feedItem.findMany({
      where: {
        userId: user.id,
        interactions: { some: { action: "save" } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Hearted items
    const heartedItems = await prisma.feedItem.findMany({
      where: {
        userId: user.id,
        interactions: { some: { action: "heart" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ unseen: unseenItems, saved: savedItems, hearted: heartedItems });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}

// POST — queue generation of a new batch of feed items
export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    if (!profile?.mergedProfile) {
      return NextResponse.json({ error: "Complete your style profile first" }, { status: 400 });
    }

    // Get recent interactions for context
    const recentHearts = await prisma.feedItem.findMany({
      where: { userId: user.id, interactions: { some: { action: "heart" } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentSkips = await prisma.feedItem.findMany({
      where: { userId: user.id, interactions: { some: { action: "skip" } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Check for existing pending/processing task to avoid duplicates
    const existingTask = await prisma.styleTask.findFirst({
      where: {
        userId: user.id,
        type: "feed_generation",
        status: { in: ["pending", "processing"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingTask) {
      const ageMs = Date.now() - existingTask.createdAt.getTime();
      if (ageMs < 10 * 60 * 1000) {
        return NextResponse.json({
          taskId: existingTask.id,
          taskStatus: existingTask.status,
        });
      }
      // Stale — mark failed
      await prisma.styleTask.update({
        where: { id: existingTask.id },
        data: { status: "failed", error: "Timed out after 10 minutes" },
      });
    }

    const prompt = FEED_GENERATION_PROMPT
      .replace("{styleProfile}", profile.mergedProfile)
      .replace("{hearts}", JSON.stringify(recentHearts.map((i) => `${i.brand} ${i.itemName}`)))
      .replace("{skips}", JSON.stringify(recentSkips.map((i) => `${i.brand} ${i.itemName}`)));

    // Queue AI task
    const task = await prisma.styleTask.create({
      data: {
        userId: user.id,
        type: "feed_generation",
        payload: JSON.stringify({ prompt }),
      },
    });

    return NextResponse.json({
      taskId: task.id,
      taskStatus: task.status,
    });
  } catch (error) {
    console.error("Error queuing feed generation:", error);
    return NextResponse.json({ error: "Failed to queue feed generation" }, { status: 500 });
  }
}
