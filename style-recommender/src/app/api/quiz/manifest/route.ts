import { NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { readFile } from "fs/promises";
import { join } from "path";

const FASHION_DATA_DIR = process.env.FASHION_DATA_DIR || "";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!FASHION_DATA_DIR) {
      return NextResponse.json({ error: "Fashion data not configured" }, { status: 500 });
    }

    const manifestPath = join(FASHION_DATA_DIR, "looks", "quiz-manifest.json");
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    return NextResponse.json(manifest);
  } catch (error) {
    console.error("Error loading quiz manifest:", error);
    return NextResponse.json({ error: "Failed to load manifest" }, { status: 500 });
  }
}
