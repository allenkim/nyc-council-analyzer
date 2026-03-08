import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

/**
 * POST /api/quiz/reset — Reset quiz, profile, and related data.
 * Old data is deleted (cascade handles related tasks).
 * User can start fresh from quiz step 1.
 */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete in order: tasks, profiles, quiz responses, selfies, feed
  // (Prisma cascade handles most of this, but being explicit)
  await prisma.$transaction([
    prisma.styleTask.deleteMany({ where: { userId: user.id } }),
    prisma.styleProfile.deleteMany({ where: { userId: user.id } }),
    prisma.quizResponse.deleteMany({ where: { userId: user.id } }),
    prisma.selfieUpload.deleteMany({ where: { userId: user.id } }),
    prisma.feedInteraction.deleteMany({ where: { userId: user.id } }),
    prisma.feedItem.deleteMany({ where: { userId: user.id } }),
    prisma.outfitCheck.deleteMany({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
