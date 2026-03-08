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

    const catalogPath = join(FASHION_DATA_DIR, "looks", "looks-catalog.json");
    const raw = await readFile(catalogPath, "utf-8");
    const catalog = JSON.parse(raw);

    // Optional filter by aesthetic (comma-separated)
    const aesthetic = request.nextUrl.searchParams.get("aesthetic");
    if (aesthetic) {
      const aesthetics = aesthetic.split(",");
      catalog.items = catalog.items.filter(
        (item: { aesthetic: string }) => aesthetics.includes(item.aesthetic)
      );
    }

    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json({ items: [] });
  }
}
