import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!FASHION_DATA_DIR) {
      return NextResponse.json({ items: [] });
    }

    const catalogPath = join(FASHION_DATA_DIR, "catalog.json");
    const catalog = await getCachedData(catalogPath);

    // Filter by brand name (case-insensitive partial match)
    const brand = request.nextUrl.searchParams.get("brand");
    if (brand) {
      const lower = brand.toLowerCase();
      catalog.items = catalog.items.filter(
        (item: { brand?: string; aiBrand?: string }) => {
          const itemBrand = (item.brand || item.aiBrand || "").toLowerCase();
          return itemBrand.includes(lower) || lower.includes(itemBrand);
        }
      );
    }

    // Limit results
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "5", 10);
    catalog.items = catalog.items.slice(0, limit);

    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json({ items: [] });
  }
}
