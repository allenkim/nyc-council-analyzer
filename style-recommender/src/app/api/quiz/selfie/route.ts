import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { uploadToDrive } from "@/lib/drive";
import { analyzeWithClaude } from "@/lib/claude";
import { analyzeWithGemini } from "@/lib/gemini";
import { SELFIE_ANALYSIS_PROMPT } from "@/lib/prompts";

// POST — upload selfie and run dual-model analysis
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
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Upload to Google Drive
    const driveFileId = await uploadToDrive(
      buffer,
      `selfie-${user.id}-${Date.now()}.${file.name.split(".").pop()}`,
      mimeType,
      "Selfies"
    );

    // Run Claude and Gemini analysis in parallel
    const [claudeResult, geminiResult] = await Promise.allSettled([
      analyzeWithClaude(SELFIE_ANALYSIS_PROMPT, {
        imageBase64: base64,
        mediaType: mimeType,
        model: "claude-sonnet-4-6",
      }),
      analyzeWithGemini(SELFIE_ANALYSIS_PROMPT, {
        imageBase64: base64,
        mimeType,
      }),
    ]);

    const claudeAnalysis = claudeResult.status === "fulfilled" ? claudeResult.value : null;
    const geminiAnalysis = geminiResult.status === "fulfilled" ? geminiResult.value : null;

    // Save to database
    const selfieUpload = await prisma.selfieUpload.create({
      data: {
        userId: user.id,
        driveFileId,
        originalFilename: file.name,
        analysisResultClaude: claudeAnalysis,
        analysisResultGemini: geminiAnalysis,
      },
    });

    return NextResponse.json(selfieUpload);
  } catch (error) {
    console.error("Error processing selfie:", error);
    return NextResponse.json({ error: "Failed to process selfie" }, { status: 500 });
  }
}

// GET — fetch user's selfie uploads
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const selfies = await prisma.selfieUpload.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(selfies);
  } catch (error) {
    console.error("Error fetching selfies:", error);
    return NextResponse.json({ error: "Failed to fetch selfies" }, { status: 500 });
  }
}
