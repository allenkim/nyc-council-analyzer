import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { uploadToDrive } from "@/lib/drive";
import { analyzeWithClaude } from "@/lib/claude";
import { analyzeWithGemini } from "@/lib/gemini";
import { OUTFIT_CHECK_PROMPT } from "@/lib/prompts";

// POST — upload outfit photo and get dual-model feedback
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
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Upload to Drive
    const driveFileId = await uploadToDrive(
      buffer,
      `outfit-${user.id}-${Date.now()}.${file.name.split(".").pop()}`,
      mimeType,
      "Outfit Checks"
    );

    // Build prompt with profile context
    const prompt = OUTFIT_CHECK_PROMPT.replace(
      "{styleProfile}",
      profile?.mergedProfile || "No style profile available yet."
    );

    // Run both models in parallel
    const [claudeResult, geminiResult] = await Promise.allSettled([
      analyzeWithClaude(prompt, { imageBase64: base64, mediaType: mimeType }),
      analyzeWithGemini(prompt, { imageBase64: base64, mimeType }),
    ]);

    const outfitCheck = await prisma.outfitCheck.create({
      data: {
        userId: user.id,
        driveFileId,
        feedbackClaude: claudeResult.status === "fulfilled" ? claudeResult.value : null,
        feedbackGemini: geminiResult.status === "fulfilled" ? geminiResult.value : null,
      },
    });

    return NextResponse.json(outfitCheck);
  } catch (error) {
    console.error("Error checking outfit:", error);
    return NextResponse.json({ error: "Failed to check outfit" }, { status: 500 });
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
