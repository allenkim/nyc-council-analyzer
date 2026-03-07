import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

// GET — fetch user's quiz responses
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const responses = await prisma.quizResponse.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(responses);
  } catch (error) {
    console.error("Error fetching quiz responses:", error);
    return NextResponse.json({ error: "Failed to fetch quiz responses" }, { status: 500 });
  }
}

// POST — save/update a quiz category's answers
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { category, answers } = await request.json();

    if (!category || !answers) {
      return NextResponse.json({ error: "category and answers required" }, { status: 400 });
    }

    const response = await prisma.quizResponse.upsert({
      where: { userId_category: { userId: user.id, category } },
      update: { answers: JSON.stringify(answers) },
      create: {
        userId: user.id,
        category,
        answers: JSON.stringify(answers),
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error saving quiz response:", error);
    return NextResponse.json({ error: "Failed to save quiz response" }, { status: 500 });
  }
}
