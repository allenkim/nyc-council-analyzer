import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { createProfileSchema } from "@/lib/validation";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    // Support partial updates (e.g., just target allocation fields)
    const partialSchema = createProfileSchema.partial();
    const parsed = partialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    // For upsert, we need required fields — check if profile exists
    const existing = await prisma.userProfile.findUnique({ where: { userId: user.id } });

    if (existing) {
      // Update: partial is fine
      const profile = await prisma.userProfile.update({
        where: { userId: user.id },
        data: parsed.data,
      });
      return NextResponse.json(profile);
    }

    // Create: need full schema
    const fullParsed = createProfileSchema.safeParse(body);
    if (!fullParsed.success) {
      return NextResponse.json(
        { error: fullParsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const profile = await prisma.userProfile.create({
      data: { userId: user.id, ...fullParsed.data },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
