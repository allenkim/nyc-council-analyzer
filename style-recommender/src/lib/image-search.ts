import { saveImage, type ImageFolder } from "./storage";

const API_KEY = process.env.GOOGLE_CSE_API_KEY;
const CX = process.env.GOOGLE_CSE_CX;

interface SearchResult {
  title: string;
  link: string; // direct image URL
  image: {
    width: number;
    height: number;
  };
}

interface SearchResponse {
  items?: SearchResult[];
}

/**
 * Search Google Custom Search for images.
 * Returns up to `num` results (max 10 per API call).
 */
export async function searchImages(
  query: string,
  num: number = 5
): Promise<SearchResult[]> {
  if (!API_KEY || !CX) {
    console.warn("Google CSE not configured (missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX)");
    return [];
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("cx", CX);
  url.searchParams.set("q", query);
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", String(Math.min(num, 10)));
  url.searchParams.set("imgSize", "large");
  url.searchParams.set("safe", "active");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    console.error(`Google CSE error (${res.status}):`, err);
    return [];
  }

  const data: SearchResponse = await res.json();
  return data.items || [];
}

/**
 * Download an image from a URL and save it locally.
 * Returns the local relative path, or null if download fails.
 */
export async function downloadAndSaveImage(
  imageUrl: string,
  subfolder: ImageFolder = "search"
): Promise<{ localPath: string; width?: number; height?: number } | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    // Skip tiny images (likely icons/placeholders)
    if (buffer.length < 5000) return null;

    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const localPath = await saveImage(buffer, subfolder, filename);
    return { localPath };
  } catch {
    return null;
  }
}
