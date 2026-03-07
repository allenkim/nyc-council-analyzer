import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { analyzeWithClaude } from "@/lib/claude";
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

// POST — generate a new batch of feed items
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

    const prompt = FEED_GENERATION_PROMPT
      .replace("{styleProfile}", profile.mergedProfile)
      .replace("{hearts}", JSON.stringify(recentHearts.map((i) => `${i.brand} ${i.itemName}`)))
      .replace("{skips}", JSON.stringify(recentSkips.map((i) => `${i.brand} ${i.itemName}`)));

    const response = await analyzeWithClaude(prompt, { model: "claude-sonnet-4-6" });

    // Parse items from response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    let items: Array<Record<string, string>>;
    try {
      items = JSON.parse(jsonStr.trim());
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const batchId = `batch-${Date.now()}`;

    // Create feed items (images will be fetched separately)
    const created = await prisma.feedItem.createMany({
      data: items.map((item) => ({
        userId: user.id,
        brand: item.brand,
        itemName: item.itemName,
        description: item.description,
        category: item.category,
        priceRange: item.priceRange,
        aiRationale: item.rationale,
        batchId,
      })),
    });

    return NextResponse.json({ generated: created.count, batchId });
  } catch (error) {
    console.error("Error generating feed:", error);
    return NextResponse.json({ error: "Failed to generate feed" }, { status: 500 });
  }
}
