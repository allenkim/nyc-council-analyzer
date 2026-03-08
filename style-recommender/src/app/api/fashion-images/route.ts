import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";

/**
 * GET /api/fashion-images
 *
 * Query the cached fashion image library.
 * Params:
 *   ?category=brand|style|item|inspiration|custom
 *   ?tags=korean,minimalist  (comma-separated, matches ANY)
 *   ?q=search text           (searches query and tags)
 *   ?limit=20                (default 20, max 100)
 *   ?random=true             (randomize order)
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const tags = searchParams.get("tags");
  const q = searchParams.get("q");
  const random = searchParams.get("random") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (category) where.category = category;

  // Tag filtering: search for any matching tag using LIKE
  if (tags) {
    const tagList = tags.split(",").map((t) => t.trim());
    where.OR = tagList.map((tag) => ({
      tags: { contains: tag },
    }));
  }

  // Text search across query and tags
  if (q) {
    const searchWhere = [
      { searchQuery: { contains: q } },
      { tags: { contains: q } },
    ];
    if (where.OR) {
      // Combine with existing OR
      where.AND = [{ OR: where.OR }, { OR: searchWhere }];
      delete where.OR;
    } else {
      where.OR = searchWhere;
    }
  }

  if (random) {
    // For random ordering in SQLite, we fetch more and shuffle in JS
    const all = await prisma.fashionImage.findMany({
      where,
      take: limit * 3,
    });
    const shuffled = all.sort(() => Math.random() - 0.5).slice(0, limit);
    return NextResponse.json(shuffled);
  }

  const images = await prisma.fashionImage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(images);
}
