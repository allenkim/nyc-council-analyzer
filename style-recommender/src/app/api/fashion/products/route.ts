import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { readFile } from "fs/promises";
import { join } from "path";

const FASHION_DATA_DIR = process.env.FASHION_DATA_DIR || "";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!FASHION_DATA_DIR) {
      return NextResponse.json({ items: [] });
    }

    const catalogPath = join(FASHION_DATA_DIR, "catalog.json");
    const raw = await readFile(catalogPath, "utf-8");
    const catalog = JSON.parse(raw);

    // Filter by brand name (case-insensitive partial match)
    const brand = request.nextUrl.searchParams.get("brand");
    if (brand) {
      const lower = brand.toLowerCase();
      catalog.items = catalog.items.filter(
        (item: { brand?: string; aiBrand?: string }) =>
          (item.brand || item.aiBrand || "").toLowerCase().includes(lower)
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
