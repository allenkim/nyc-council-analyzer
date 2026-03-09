import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';
import { humanDelay, sleep } from './download.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LookItem {
  id: string;
  filename: string;
  aesthetic: string;
  sourceUrl: string;
  description: string;
  createdAt: string;
}

interface LooksCatalog {
  items: LookItem[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = join(import.meta.dirname, '../../fashion-data/looks');
const IMAGES_DIR = join(DATA_DIR, 'images');
const CATALOG_PATH = join(DATA_DIR, 'looks-catalog.json');

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const AESTHETICS: Record<string, string[]> = {
  'minimalist': ['minimalist men outfit fashion', 'minimal menswear street style', 'clean simple men outfit lookbook'],
  'streetwear': ['streetwear men outfit fashion', 'street style men urban outfit', 'hypebeast outfit men 2024'],
  'classic-preppy': ['classic preppy men outfit fashion', 'preppy menswear style lookbook', 'ivy prep men outfit inspiration'],
  'rugged-workwear': ['rugged workwear men outfit fashion', 'workwear americana men style', 'heritage menswear outfit raw denim boots'],
  'athleisure': ['athleisure men outfit fashion', 'sporty casual men outfit style', 'athletic streetwear men look'],
  'smart-casual': ['smart casual men outfit fashion', 'business casual men style 2024', 'men smart casual street style'],
  'avant-garde': ['avant garde men outfit fashion', 'experimental menswear deconstructed', 'rick owens yohji men outfit street'],
  'city-boy': ['city boy men outfit fashion korean', 'korean men street style outfit', 'city boy aesthetic men lookbook'],
  'quiet-luxury': ['quiet luxury men outfit fashion', 'old money men style outfit', 'stealth wealth menswear look'],
  'japanese-techwear': ['japanese techwear men outfit fashion', 'techwear urban ninja outfit men', 'acronym techwear street style men'],
  'ivy-trad': ['ivy league trad men outfit fashion', 'trad menswear ivy style outfit', 'classic american ivy men look preppy'],
  'coastal-relaxed': ['coastal relaxed men outfit fashion', 'beach casual men style outfit', 'coastal grandmother men summer outfit linen'],
  'dark-academia': ['dark academia men outfit fashion', 'dark academia aesthetic men style', 'moody scholarly men outfit tweed'],
  'gorpcore': ['gorpcore men outfit fashion', 'gorpcore hiking outfit men style', 'outdoor tech men fashion trail'],
  'soft-boy': ['soft boy men outfit fashion', 'soft boy aesthetic men pastel outfit', 'gentle men style cardigan cozy'],
  'grunge': ['grunge men outfit fashion', 'grunge aesthetic men style flannel', '90s grunge men outfit layered'],
  'skater': ['skater men outfit fashion style', 'skate style men outfit street', 'skateboarder fashion men baggy'],
  'military-utility': ['military utility men outfit fashion', 'military style men cargo outfit', 'utility fashion men tactical wear'],
};

/** Resolution tiers to try, in descending quality order. */
const IMAGE_RESOLUTIONS = ['/originals/', '/736x/', '/474x/'] as const;

// ---------------------------------------------------------------------------
// Catalog helpers
// ---------------------------------------------------------------------------

async function loadLooksCatalog(): Promise<LooksCatalog> {
  try {
    const raw = await readFile(CATALOG_PATH, 'utf-8');
    return JSON.parse(raw) as LooksCatalog;
  } catch {
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

async function saveLooksCatalog(catalog: LooksCatalog): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  catalog.updatedAt = new Date().toISOString();
  await writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2));
}

function makeId(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 12);
}

function hasLook(catalog: LooksCatalog, sourceUrl: string): boolean {
  const id = makeId(sourceUrl);
  return catalog.items.some((item) => item.id === id);
}

// ---------------------------------------------------------------------------
// Image download (adapted for looks directory)
// ---------------------------------------------------------------------------

function guessExtension(contentType: string, url: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  const urlExt = url.split('?')[0].split('.').pop()?.toLowerCase();
  if (urlExt && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExt)) return urlExt;
  return 'jpg';
}

/**
 * Try downloading the image at the best available resolution.
 * Pinterest thumbnails use `/236x/` — we try `/originals/`, then `/736x/`, then `/474x/`,
 * and finally fall back to the original thumbnail URL.
 */
async function downloadLookImage(thumbnailUrl: string, id: string): Promise<string | null> {
  await mkdir(IMAGES_DIR, { recursive: true });

  const urlsToTry: string[] = [];

  // Build resolution variants if it's a pinimg thumbnail
  if (thumbnailUrl.includes('/236x/')) {
    for (const res of IMAGE_RESOLUTIONS) {
      urlsToTry.push(thumbnailUrl.replace('/236x/', res));
    }
  }
  // Always keep the original URL as final fallback
  urlsToTry.push(thumbnailUrl);

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        console.error(`[looks-dl] ${res.status} for ${url}`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = guessExtension(res.headers.get('content-type') || '', url);
      const filename = `${id}.${ext}`;
      await writeFile(join(IMAGES_DIR, filename), buffer);

      console.log(`[looks-dl] Saved ${filename} (${(buffer.length / 1024).toFixed(0)}KB)`);
      return filename;
    } catch (err) {
      console.error(`[looks-dl] Error fetching ${url}:`, err);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Pinterest scraper
// ---------------------------------------------------------------------------

interface PinData {
  pinUrl: string;
  imageUrl: string;
  altText: string;
}

async function scrapePinterest(query: string, limit: number): Promise<PinData[]> {
  const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
  console.log(`[pinterest] Navigating to ${searchUrl}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for pin links to appear
    await page.waitForSelector('a[href*="/pin/"]', { timeout: 30000 });

    // Try to dismiss Pinterest login modal (may or may not appear)
    await page.evaluate(() => {
      (document.querySelector('[aria-label="close"]') as HTMLElement | null)?.click();
      (document.querySelector('button[aria-label="Close"]') as HTMLElement | null)?.click();
    });

    await sleep(1000);

    let pins: PinData[] = [];
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;

    while (pins.length < limit && scrollAttempts < maxScrollAttempts) {
      // Extract pin data from current DOM
      pins = await page.$$eval('a[href*="/pin/"]', (anchors) => {
        const seen = new Set<string>();
        const results: { pinUrl: string; imageUrl: string; altText: string }[] = [];

        for (const a of anchors) {
          const href = a.getAttribute('href');
          if (!href || !href.startsWith('/pin/')) continue;

          // Deduplicate by pin URL
          const pinUrl = `https://www.pinterest.com${href}`;
          if (seen.has(pinUrl)) continue;
          seen.add(pinUrl);

          const img = a.querySelector('img');
          if (!img) continue;

          const src = img.getAttribute('src') || '';
          if (!src.includes('pinimg.com')) continue;

          results.push({
            pinUrl,
            imageUrl: src,
            altText: img.getAttribute('alt') || '',
          });
        }

        return results;
      });

      console.log(`[pinterest] Found ${pins.length}/${limit} pins (scroll attempt ${scrollAttempts})`);

      if (pins.length >= limit) break;

      // Scroll down to load more pins
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await humanDelay(1500, 3000);
      scrollAttempts++;
    }

    return pins.slice(0, limit);
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const aestheticIdx = args.indexOf('--aesthetic');
  const limitIdx = args.indexOf('--limit');

  const aestheticArg = aestheticIdx >= 0 ? args[aestheticIdx + 1] : null;
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 15;

  if (!aestheticArg) {
    const valid = [...Object.keys(AESTHETICS), 'all'].join(', ');
    console.error(`Usage: npm run fashion:looks -- --aesthetic <${valid}> [--limit <n>]`);
    process.exit(1);
  }

  const aestheticsToScrape: string[] =
    aestheticArg === 'all' ? Object.keys(AESTHETICS) : [aestheticArg];

  // Validate requested aesthetics
  for (const a of aestheticsToScrape) {
    if (!AESTHETICS[a]) {
      console.error(`Unknown aesthetic "${a}". Valid: ${Object.keys(AESTHETICS).join(', ')}`);
      process.exit(1);
    }
  }

  const catalog = await loadLooksCatalog();
  const summary: Record<string, { added: number; skipped: number }> = {};

  for (const aesthetic of aestheticsToScrape) {
    const queries = AESTHETICS[aesthetic];
    const perQuery = Math.ceil(limit / queries.length);

    let added = 0;
    let skipped = 0;

    for (const query of queries) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Scraping looks for: ${aesthetic} (query: "${query}", limit: ${perQuery})`);
      console.log('='.repeat(60));

      let pins: PinData[];
      try {
        pins = await scrapePinterest(query, perQuery);
      } catch (err) {
        console.error(`[${aesthetic}] Scrape failed for query "${query}":`, err);
        continue;
      }

      for (const pin of pins) {
        if (hasLook(catalog, pin.pinUrl)) {
          skipped++;
          continue;
        }

        const id = makeId(pin.pinUrl);
        const filename = await downloadLookImage(pin.imageUrl, id);
        if (!filename) continue;

        const item: LookItem = {
          id,
          filename,
          aesthetic,
          sourceUrl: pin.pinUrl,
          description: pin.altText,
          createdAt: new Date().toISOString(),
        };

        catalog.items.push(item);
        added++;
      }

      await saveLooksCatalog(catalog);

      // Delay between queries to avoid detection
      console.log(`[looks] Waiting before next query...`);
      await humanDelay(3000, 6000);
    }

    summary[aesthetic] = { added, skipped };
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  for (const [aesthetic, counts] of Object.entries(summary)) {
    console.log(`  ${aesthetic}: ${counts.added} added, ${counts.skipped} skipped`);
  }
  console.log(`\nCatalog now has ${catalog.items.length} looks total`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
