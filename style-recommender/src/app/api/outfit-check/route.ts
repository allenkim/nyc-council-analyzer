import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { saveImage } from "@/lib/storage";
import { OUTFIT_CHECK_PROMPT } from "@/lib/prompts";

// POST — upload outfit photo, save locally, queue dual-model feedback
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("outfit") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get user's style profile for context
    const profile = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `outfit-${user.id}-${Date.now()}.${ext}`;

    // Save image locally
    const imagePath = await saveImage(buffer, "outfits", filename);

    // Build prompt with profile context
    const prompt = OUTFIT_CHECK_PROMPT.replace(
      "{styleProfile}",
      profile?.mergedProfile || "No style profile available yet."
    );

    // Create outfit check record (no feedback yet)
    const outfitCheck = await prisma.outfitCheck.create({
      data: {
        userId: user.id,
        imagePath,
      },
    });

    // Queue AI task
    const task = await prisma.styleTask.create({
      data: {
        userId: user.id,
        type: "outfit_check",
        targetId: outfitCheck.id,
        payload: JSON.stringify({
          prompt,
          imagePath,
        }),
      },
    });

    return NextResponse.json({
      ...outfitCheck,
      taskId: task.id,
      taskStatus: task.status,
    });
  } catch (error) {
    console.error("Error processing outfit check:", error);
    return NextResponse.json({ error: "Failed to process outfit check" }, { status: 500 });
  }
}

// GET — fetch outfit check history
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const checks = await prisma.outfitCheck.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(checks);
  } catch (error) {
    console.error("Error fetching outfit checks:", error);
    return NextResponse.json({ error: "Failed to fetch outfit checks" }, { status: 500 });
  }
}
