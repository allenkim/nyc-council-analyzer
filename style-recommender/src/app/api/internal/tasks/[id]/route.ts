import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isWorkerAuthorized(request: NextRequest): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  return !!token && token === process.env.WORKER_TOKEN;
}

// PUT — worker updates task status and result
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isWorkerAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, result, error } = body as {
    status: "processing" | "completed" | "failed";
    result?: string;
    error?: string;
  };

  const task = await prisma.styleTask.update({
    where: { id },
    data: {
      status,
      ...(result !== undefined ? { result } : {}),
      ...(error !== undefined ? { error } : {}),
    },
  });

  // On completion, apply results to the target record
  if (status === "completed" && result) {
    try {
      await applyTaskResult(task.type, task.targetId, task.userId, result);
    } catch (err) {
      console.error("Failed to apply task result:", err);
    }
  }

  return NextResponse.json({ id: task.id, status: task.status });
}

async function applyTaskResult(
  type: string,
  targetId: string | null,
  userId: string,
  resultJson: string
) {
  const result = JSON.parse(resultJson);

  switch (type) {
    case "selfie_analysis": {
      if (!targetId) return;
      await prisma.selfieUpload.update({
        where: { id: targetId },
        data: {
          analysisResultClaude: result.claude || null,
          analysisResultGemini: result.gemini || null,
        },
      });
      break;
    }

    case "profile_generation": {
      const claudeProfile = result.claude || null;
      const geminiProfile = result.gemini || null;

      // Parse JSON from responses
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

      const styleArchetype =
        (claudeParsed?.styleArchetype as string | undefined) ||
        (geminiParsed?.styleArchetype as string | undefined) ||
        null;

      // Get selfie analysis for color/kibbe
      const selfie = await prisma.selfieUpload.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      let colorSeason: string | null = null;
      let kibbeType: string | null = null;
      if (selfie?.analysisResultClaude) {
        const parsed = parseJsonResponse(selfie.analysisResultClaude);
        colorSeason = (parsed?.colorSeason as string) || null;
        kibbeType = (parsed?.kibbeType as string) || null;
      }

      const profilePayload = {
        profileDataClaude: claudeProfile,
        profileDataGemini: geminiProfile,
        mergedProfile: JSON.stringify({ claude: claudeParsed, gemini: geminiParsed }),
        colorSeason,
        kibbeType,
        styleArchetype,
      };

      if (targetId) {
        await prisma.styleProfile.update({
          where: { id: targetId },
          data: profilePayload,
        });
      } else {
        await prisma.styleProfile.create({
          data: { userId, ...profilePayload },
        });
      }
      break;
    }

    case "feed_generation": {
      const items = result.items as Array<Record<string, string>>;
      if (!items?.length) return;

      const batchId = `batch-${Date.now()}`;
      await prisma.feedItem.createMany({
        data: items.map((item) => ({
          userId,
          brand: item.brand,
          itemName: item.itemName,
          description: item.description,
          category: item.category,
          priceRange: item.priceRange || null,
          aiRationale: item.rationale || null,
          batchId,
        })),
      });
      break;
    }

    case "outfit_check": {
      if (!targetId) return;
      await prisma.outfitCheck.update({
        where: { id: targetId },
        data: {
          feedbackClaude: result.claude || null,
          feedbackGemini: result.gemini || null,
        },
      });
      break;
    }
  }
}
