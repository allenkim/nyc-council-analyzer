import { chromium } from 'playwright';
import { humanDelay } from '../download.js';
import type { ScrapeResult } from '../types.js';

const BASE_URL = 'https://www.ssense.com';

const CATEGORIES: Record<string, string> = {
  shoes: '/en-us/men/shoes',
  sneakers: '/en-us/men/sneakers',
  boots: '/en-us/men/boots',
  bags: '/en-us/men/bags',
  tops: '/en-us/men/tops',
  pants: '/en-us/men/pants',
  outerwear: '/en-us/men/outerwear',
  accessories: '/en-us/men/accessories',
  'w-shoes': '/en-us/women/shoes',
  'w-bags': '/en-us/women/bags',
  'w-tops': '/en-us/women/tops',
  'w-dresses': '/en-us/women/dresses',
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

interface JsonLdProduct {
  '@type': string;
  productID?: string;
  name?: string;
  brand?: { '@type': string; name: string };
  offers?: { '@type': string; price: number; priceCurrency?: string };
  url?: string;
  image?: string;
}

/**
 * Scrape SSENSE category page using JSON-LD structured data.
 * Optionally visits detail pages for material composition.
 */
export async function scrapeSSENSE(category: string, limit: number): Promise<ScrapeResult[]> {
  const path = CATEGORIES[category];
  if (!path) {
    const valid = Object.keys(CATEGORIES).join(', ');
    throw new Error(`Unknown SSENSE category "${category}". Valid: ${valid}`);
  }

  const url = `${BASE_URL}${path}`;
  console.log(`[ssense] Navigating to ${url}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for product links to confirm page loaded
    await page.waitForSelector('a[href*="/product/"]', { timeout: 30000 });

    // Extract all JSON-LD blocks
    const jsonLdBlocks = await page.$$eval(
      'script[type="application/ld+json"]',
      (scripts) => scripts.map((s) => s.textContent || ''),
    );

    // Parse and filter for Product entries
    const products: JsonLdProduct[] = [];
    for (const raw of jsonLdBlocks) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item?.['@type'] === 'Product') products.push(item as JsonLdProduct);
          }
        } else if (typeof parsed === 'object' && parsed !== null) {
          const obj = parsed as Record<string, unknown>;
          if (obj['@type'] === 'Product') products.push(obj as unknown as JsonLdProduct);
        }
      } catch {
        // Skip malformed JSON-LD
      }
    }

    console.log(`[ssense] Found ${products.length} products in JSON-LD`);

    const capped = products.slice(0, limit);

    // Map JSON-LD to ScrapeResult
    const results: ScrapeResult[] = capped.map((p) => ({
      imageUrl: p.image || '',
      productUrl: p.url ? `${BASE_URL}/en-us${p.url}` : '',
      brand: p.brand?.name,
      name: p.name,
      price: p.offers?.price,
      currency: p.offers?.priceCurrency || 'USD',
    }));

    // Visit detail pages to scrape material composition
    const detailLimit = Math.min(limit, results.length);
    for (let i = 0; i < detailLimit; i++) {
      const result = results[i];
      if (!result.productUrl) continue;

      try {
        await humanDelay(1000, 3000);
        console.log(`[ssense] Detail ${i + 1}/${detailLimit}: ${result.productUrl}`);

        await page.goto(result.productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Look for material text in paragraphs (pattern: "Upper: calfskin. Sole: rubber.")
        const material = await page.evaluate(() => {
          const paragraphs = document.querySelectorAll('p');
          for (const p of paragraphs) {
            const text = p.textContent?.trim() || '';
            // Match material patterns like "Upper: ...", "Sole: ...", "100% ..."
            if (/\b(upper|sole|lining|insole|body|shell|fill|cotton|polyester|leather|wool|silk|nylon|cashmere|linen)\b/i.test(text) &&
                text.includes(':') &&
                text.length < 500) {
              return text;
            }
          }
          return null;
        });

        if (material) {
          result.material = material;
          console.log(`[ssense]   Material: ${material.slice(0, 80)}${material.length > 80 ? '...' : ''}`);
        }
      } catch (err) {
        console.error(`[ssense]   Failed to get detail for ${result.productUrl}:`, err);
      }
    }

    // Filter out entries missing image or product URL
    return results.filter((r) => r.imageUrl && r.productUrl);
  } finally {
    await browser.close();
  }
}
