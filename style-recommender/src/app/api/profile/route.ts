import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { analyzeWithClaude } from "@/lib/claude";
import { analyzeWithGemini } from "@/lib/gemini";
import { STYLE_PROFILE_PROMPT } from "@/lib/prompts";

// GET — fetch user's style profile
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// POST — generate style profile from quiz + selfie data
export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Gather all quiz responses
    const quizResponses = await prisma.quizResponse.findMany({
      where: { userId: user.id },
    });

    if (quizResponses.length === 0) {
      return NextResponse.json({ error: "Complete the quiz first" }, { status: 400 });
    }

    const quizData = Object.fromEntries(
      quizResponses.map((r) => [r.category, JSON.parse(r.answers)])
    );

    // Get latest selfie analysis
    const selfie = await prisma.selfieUpload.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const selfieAnalysis = selfie
      ? { claude: selfie.analysisResultClaude, gemini: selfie.analysisResultGemini }
      : null;

    // Build the prompt
    const prompt = STYLE_PROFILE_PROMPT
      .replace("{quizData}", JSON.stringify(quizData, null, 2))
      .replace("{selfieAnalysis}", JSON.stringify(selfieAnalysis, null, 2));

    // Run Claude (Opus) and Gemini in parallel
    const [claudeResult, geminiResult] = await Promise.allSettled([
      analyzeWithClaude(prompt, { model: "claude-opus-4-6" }),
      analyzeWithGemini(prompt),
    ]);

    const claudeProfile = claudeResult.status === "fulfilled" ? claudeResult.value : null;
    const geminiProfile = geminiResult.status === "fulfilled" ? geminiResult.value : null;

    // Parse JSON from responses (handle markdown code blocks)
    function parseJsonResponse(text: string | null): Record<string, unknown> | null {
      if (!text) return null;
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      try {
        return JSON.parse(jsonStr.trim());
      } catch {
        return null;
      }
    }

    const claudeParsed = parseJsonResponse(claudeProfile);
    const geminiParsed = parseJsonResponse(geminiProfile);

    // Extract key fields from whichever model succeeded
    const colorSeason = selfieAnalysis?.claude
      ? (parseJsonResponse(selfieAnalysis.claude) as Record<string, unknown> | null)?.colorSeason as string | null ?? null
      : null;

    const kibbeType = selfieAnalysis?.claude
      ? (parseJsonResponse(selfieAnalysis.claude) as Record<string, unknown> | null)?.kibbeType as string | null ?? null
      : null;

    const styleArchetype =
      (claudeParsed?.styleArchetype as string | undefined) ||
      (geminiParsed?.styleArchetype as string | undefined) ||
      null;

    // Find existing profile for upsert
    const existing = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
    });

    const profilePayload = {
      profileDataClaude: claudeProfile,
      profileDataGemini: geminiProfile,
      mergedProfile: JSON.stringify({ claude: claudeParsed, gemini: geminiParsed }),
      colorSeason,
      kibbeType,
      styleArchetype,
    };

    const profile = await prisma.styleProfile.upsert({
      where: { id: existing?.id || "" },
      update: profilePayload,
      create: {
        userId: user.id,
        ...profilePayload,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error generating profile:", error);
    return NextResponse.json({ error: "Failed to generate profile" }, { status: 500 });
  }
}
