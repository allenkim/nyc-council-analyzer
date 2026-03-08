import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
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

// POST — queue style profile generation from quiz + selfie data
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

    // Get all selfie analyses
    const selfies = await prisma.selfieUpload.findMany({
      where: {
        userId: user.id,
        OR: [
          { analysisResultClaude: { not: null } },
          { analysisResultGemini: { not: null } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const selfieAnalysis =
      selfies.length > 0
        ? selfies.map((s, i) => ({
            photoNumber: i + 1,
            claude: s.analysisResultClaude,
            gemini: s.analysisResultGemini,
          }))
        : null;

    // Build the prompt
    const prompt = STYLE_PROFILE_PROMPT
      .replace("{quizData}", JSON.stringify(quizData, null, 2))
      .replace("{selfieAnalysis}", JSON.stringify(selfieAnalysis, null, 2));

    // Find or create a profile record to update
    let profile = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
    });

    if (!profile) {
      profile = await prisma.styleProfile.create({
        data: { userId: user.id },
      });
    }

    // Queue AI task
    const task = await prisma.styleTask.create({
      data: {
        userId: user.id,
        type: "profile_generation",
        targetId: profile.id,
        payload: JSON.stringify({ prompt }),
      },
    });

    return NextResponse.json({
      taskId: task.id,
      taskStatus: task.status,
      profileId: profile.id,
    });
  } catch (error) {
    console.error("Error queuing profile generation:", error);
    return NextResponse.json({ error: "Failed to queue profile generation" }, { status: 500 });
  }
}
