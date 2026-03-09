import { chromium } from 'playwright';
import { humanDelay } from '../download.js';
import type { ScrapeResult } from '../types.js';

const BASE_URL = 'https://www.farfetch.com';

const CATEGORIES: Record<string, string> = {
  shoes: '/shopping/men/shoes-2/items.aspx',
  sneakers: '/shopping/men/trainers-2/items.aspx',
  boots: '/shopping/men/boots-2/items.aspx',
  bags: '/shopping/men/bags-men/items.aspx',
  clothing: '/shopping/men/clothing-2/items.aspx',
  accessories: '/shopping/men/accessories-all-2/items.aspx',
  'w-shoes': '/shopping/women/shoes-1/items.aspx',
  'w-bags': '/shopping/women/bags-purses-1/items.aspx',
  'w-clothing': '/shopping/women/clothing-1/items.aspx',
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Scrape Farfetch category page by parsing product link cards.
 * Paginates via ?page=N when needed. No detail page visits.
 */
export async function scrapeFarfetch(category: string, limit: number): Promise<ScrapeResult[]> {
  const path = CATEGORIES[category];
  if (!path) {
    const valid = Object.keys(CATEGORIES).join(', ');
    throw new Error(`Unknown Farfetch category "${category}". Valid: ${valid}`);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    const results: ScrapeResult[] = [];
    let pageNum = 1;

    while (results.length < limit) {
      const url = pageNum === 1
        ? `${BASE_URL}${path}`
        : `${BASE_URL}${path}?page=${pageNum}`;

      console.log(`[farfetch] Navigating to ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Wait for product links
      try {
        await page.waitForSelector('a[href*="item-"]', { timeout: 30000 });
      } catch {
        console.log(`[farfetch] No product links found on page ${pageNum}, stopping.`);
        break;
      }

      const items = await page.$$eval('a[href*="item-"]', (links) => {
        return links.map((link) => {
          const anchor = link as HTMLAnchorElement;
          const href = anchor.href;

          // Get image src
          const img = anchor.querySelector('img');
          const imageUrl = img?.src || '';

          // Get all paragraph texts inside the link
          const paragraphs = Array.from(anchor.querySelectorAll('p')).map(
            (p) => p.textContent?.trim() || '',
          );

          // Parse paragraphs:
          // Badge (optional: "New Season", "Featured", or empty) is first
          // Brand is 2nd, name is 3rd
          // First paragraph starting with "$" is the price
          let brand = '';
          let name = '';
          let priceStr = '';

          // Filter out empty paragraphs for analysis, but keep original order
          const nonEmpty = paragraphs.filter((t) => t.length > 0);

          if (nonEmpty.length >= 3) {
            // First is badge, second is brand, third is name
            brand = nonEmpty[1];
            name = nonEmpty[2];
          } else if (nonEmpty.length === 2) {
            brand = nonEmpty[0];
            name = nonEmpty[1];
          }

          // Find first price (starts with $)
          for (const t of nonEmpty) {
            if (t.startsWith('$')) {
              priceStr = t;
              break;
            }
          }

          return { href, imageUrl, brand, name, priceStr };
        });
      });

      console.log(`[farfetch] Page ${pageNum}: found ${items.length} product links`);

      if (items.length === 0) break;

      for (const item of items) {
        if (results.length >= limit) break;

        // Parse price: "$271" -> 271, "$1,200" -> 1200
        let price: number | undefined;
        if (item.priceStr) {
          const cleaned = item.priceStr.replace(/[$,]/g, '');
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed)) price = parsed;
        }

        results.push({
          imageUrl: item.imageUrl,
          productUrl: item.href,
          brand: item.brand || undefined,
          name: item.name || undefined,
          price,
          currency: price !== undefined ? 'USD' : undefined,
        });
      }

      if (results.length >= limit) break;

      // Paginate
      pageNum++;
      await humanDelay(2000, 5000);
    }

    console.log(`[farfetch] Total scraped: ${results.length}`);

    // Filter out entries missing image or product URL
    return results.filter((r) => r.imageUrl && r.productUrl);
  } finally {
    await browser.close();
  }
}
