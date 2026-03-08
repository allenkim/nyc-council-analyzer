import { NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { readFile } from "fs/promises";
import { join } from "path";

const FASHION_DATA_DIR = process.env.FASHION_DATA_DIR || "";

let cache: { data: unknown; loadedAt: number } | null = null;
const CACHE_TTL = 300_000; // 5 minutes

async function getCachedData(filePath: string) {
  if (!cache || Date.now() - cache.loadedAt > CACHE_TTL) {
    const raw = await readFile(filePath, "utf-8");
    cache = { data: JSON.parse(raw), loadedAt: Date.now() };
  }
  // Return a deep copy so mutations from filtering don't corrupt the cache
  return JSON.parse(JSON.stringify(cache.data));
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!FASHION_DATA_DIR) {
      return NextResponse.json({ error: "Fashion data not configured" }, { status: 500 });
    }

    const manifestPath = join(FASHION_DATA_DIR, "looks", "quiz-manifest.json");
    const manifest = await getCachedData(manifestPath);

    return NextResponse.json(manifest);
  } catch (error) {
    console.error("Error loading quiz manifest:", error);
    return NextResponse.json({ error: "Failed to load manifest" }, { status: 500 });
  }
}
