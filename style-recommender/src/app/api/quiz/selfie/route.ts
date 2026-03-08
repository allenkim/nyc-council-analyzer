import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { saveImage } from "@/lib/storage";
import { SELFIE_ANALYSIS_PROMPT } from "@/lib/prompts";

// POST — upload selfie, save locally, queue AI analysis
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("selfie") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `selfie-${user.id}-${Date.now()}.${ext}`;

    // Save image locally
    const imagePath = await saveImage(buffer, "selfies", filename);

    // Create selfie record (no analysis yet)
    const selfieUpload = await prisma.selfieUpload.create({
      data: {
        userId: user.id,
        imagePath,
        originalFilename: file.name,
      },
    });

    // Queue AI analysis task
    const task = await prisma.styleTask.create({
      data: {
        userId: user.id,
        type: "selfie_analysis",
        targetId: selfieUpload.id,
        payload: JSON.stringify({
          prompt: SELFIE_ANALYSIS_PROMPT,
          imagePath,
        }),
      },
    });

    return NextResponse.json({
      ...selfieUpload,
      taskId: task.id,
      taskStatus: task.status,
    });
  } catch (error) {
    console.error("Error processing selfie:", error);
    return NextResponse.json({ error: "Failed to process selfie" }, { status: 500 });
  }
}

// GET — fetch user's selfie uploads with task status for pending analyses
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const selfies = await prisma.selfieUpload.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // For selfies still missing results, look up their task status
    const pendingIds = selfies
      .filter((s) => !s.analysisResultClaude && !s.analysisResultGemini)
      .map((s) => s.id);

    const tasks =
      pendingIds.length > 0
        ? await prisma.styleTask.findMany({
            where: { targetId: { in: pendingIds }, type: "selfie_analysis" },
            orderBy: { createdAt: "desc" },
          })
        : [];

    const selfiesWithStatus = selfies.map((s) => ({
      ...s,
      taskStatus: tasks.find((t) => t.targetId === s.id)?.status ?? null,
    }));

    return NextResponse.json(selfiesWithStatus);
  } catch (error) {
    console.error("Error fetching selfies:", error);
    return NextResponse.json({ error: "Failed to fetch selfies" }, { status: 500 });
  }
}
