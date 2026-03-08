import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchImages, downloadAndSaveImage } from "@/lib/image-search";
import { pickDailyQueries } from "@/lib/search-queries";

const WORKER_TOKEN = process.env.WORKER_TOKEN;

// How many images to fetch per API call (Google CSE max is 10)
const IMAGES_PER_QUERY = 5;
// Total daily budget of 100 queries → ~20 search calls with 5 images each
const DAILY_QUERY_BUDGET = 20;

/**
 * POST /api/internal/scrape-images
 *
 * Fetches fashion images from Google Custom Search and caches them locally.
 * Called daily by cron or manually. Requires WORKER_TOKEN auth.
 *
 * Query params:
 *   ?limit=N  — override number of search queries (default: 20)
 *   ?query=X  — run a specific search query instead of picking from the list
 */
export async function POST(request: NextRequest) {
  // Auth check
  const auth = request.headers.get("authorization");
  if (!WORKER_TOKEN || auth !== `Bearer ${WORKER_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const specificQuery = searchParams.get("query");

  let queries: { query: string; category: string; tags: string }[];

  if (specificQuery) {
    queries = [{ query: specificQuery, category: "custom", tags: "custom" }];
  } else {
    const limit = limitParam ? parseInt(limitParam, 10) : DAILY_QUERY_BUDGET;
    queries = pickDailyQueries(Math.min(limit, DAILY_QUERY_BUDGET));
  }

  const results = {
    queriesRun: 0,
    imagesDownloaded: 0,
    imagesFailed: 0,
    duplicatesSkipped: 0,
    errors: [] as string[],
  };

  for (const { query, category, tags } of queries) {
    results.queriesRun++;

    try {
      const searchResults = await searchImages(query, IMAGES_PER_QUERY);

      for (const result of searchResults) {
        // Check if we already have this source URL
        const existing = await prisma.fashionImage.findFirst({
          where: { sourceUrl: result.link },
        });

        if (existing) {
          results.duplicatesSkipped++;
          continue;
        }

        // Download and save
        const saved = await downloadAndSaveImage(result.link, "search");
        if (!saved) {
          results.imagesFailed++;
          continue;
        }

        // Store in DB
        await prisma.fashionImage.create({
          data: {
            searchQuery: query,
            sourceUrl: result.link,
            localPath: saved.localPath,
            category,
            tags,
            width: result.image?.width ?? null,
            height: result.image?.height ?? null,
          },
        });

        results.imagesDownloaded++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      results.errors.push(`Query "${query}": ${msg}`);
    }

    // Small delay between API calls to be nice
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json(results);
}

/**
 * GET /api/internal/scrape-images
 *
 * Returns stats about the image library.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!WORKER_TOKEN || auth !== `Bearer ${WORKER_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [total, byCategory] = await Promise.all([
    prisma.fashionImage.count(),
    prisma.fashionImage.groupBy({
      by: ["category"],
      _count: { id: true },
    }),
  ]);

  return NextResponse.json({
    totalImages: total,
    byCategory: Object.fromEntries(
      byCategory.map((c) => [c.category, c._count.id])
    ),
  });
}
