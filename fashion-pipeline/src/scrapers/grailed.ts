import { chromium } from 'playwright';
import { humanDelay } from '../download.js';
import type { ScrapeResult } from '../types.js';

const BASE_URL = 'https://www.grailed.com';

const CATEGORIES: Record<string, string> = {
  footwear: 'category=footwear.boots,footwear.formal_shoes,footwear.hitop_sneakers,footwear.leather,footwear.lowtop_sneakers,footwear.sandals,footwear.slip_ons',
  tops: 'category=tops.button_ups,tops.jerseys,tops.long_sleeve_shirts,tops.polos,tops.short_sleeve_shirts,tops.sweaters_knitwear,tops.sweatshirts_hoodies,tops.tank_tops_sleeveless,tops.turtlenecks',
  outerwear: 'category=outerwear.bombers,outerwear.cloaks_capes,outerwear.denim_jackets,outerwear.heavy_coats,outerwear.leather_jackets,outerwear.light_jackets,outerwear.parkas,outerwear.raincoats,outerwear.vests',
  bottoms: 'category=bottoms.casual_pants,bottoms.cropped_pants,bottoms.denim,bottoms.leggings,bottoms.overalls_jumpsuits,bottoms.shorts,bottoms.sweatpants_joggers,bottoms.swimwear',
  accessories: 'category=accessories.belts,accessories.glasses,accessories.gloves_scarves,accessories.hats,accessories.jewelry_watches,accessories.wallets',
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const CARD_SELECTOR = '[class*="UserItem_root"]';

/**
 * Scrape Grailed shop page by parsing item cards.
 * Uses infinite scroll to load more items when needed. No detail page visits.
 */
export async function scrapeGrailed(category: string, limit: number): Promise<ScrapeResult[]> {
  const categoryParam = CATEGORIES[category];
  if (!categoryParam) {
    const valid = Object.keys(CATEGORIES).join(', ');
    throw new Error(`Unknown Grailed category "${category}". Valid: ${valid}`);
  }

  const url = `${BASE_URL}/shop?${categoryParam}&strata=grailed&sort=latest-activity`;
  console.log(`[grailed] Navigating to ${url}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for cards to appear
    await page.waitForSelector(CARD_SELECTOR, { timeout: 30000 });

    // Scroll to load more items if needed (Grailed uses infinite scroll, ~40 items per batch)
    const maxScrollAttempts = 10;
    let scrollAttempts = 0;

    while (scrollAttempts < maxScrollAttempts) {
      const cardCount = await page.$$eval(CARD_SELECTOR, (cards) => cards.length);
      console.log(`[grailed] Cards loaded: ${cardCount}`);

      if (cardCount >= limit) break;

      // Scroll to bottom to trigger loading more
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await humanDelay(2000, 4000);

      // Check if new cards loaded
      const newCount = await page.$$eval(CARD_SELECTOR, (cards) => cards.length);
      if (newCount === cardCount) {
        console.log(`[grailed] No new cards after scroll, stopping.`);
        break;
      }

      scrollAttempts++;
    }

    // Extract data from all cards
    const items = await page.$$eval(CARD_SELECTOR, (cards) => {
      return cards.map((card) => {
        const el = card as HTMLElement;

        // Link
        const linkEl = el.querySelector('a[href*="/listings/"]') as HTMLAnchorElement | null;
        const href = linkEl?.href || '';

        // Image
        const img = el.querySelector('img') as HTMLImageElement | null;
        const imageUrl = img?.src || '';

        // Brand from designer element
        const designerEl = el.querySelector('[class*="designer"]');
        const brand = designerEl?.textContent?.trim() || '';

        // Name from title element
        const titleEl = el.querySelector('[class*="title"]');
        const name = titleEl?.textContent?.trim() || '';

        // Price: find leaf element (no children) starting with "$" and short text
        let priceStr = '';
        const allElements = el.querySelectorAll('*');
        for (const child of allElements) {
          if (child.children.length === 0) {
            const text = child.textContent?.trim() || '';
            if (text.startsWith('$') && text.length < 20) {
              priceStr = text;
              break;
            }
          }
        }

        return { href, imageUrl, brand, name, priceStr };
      });
    });

    console.log(`[grailed] Total cards extracted: ${items.length}`);

    const results: ScrapeResult[] = [];
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

    // Filter out entries missing image or product URL
    return results.filter((r) => r.imageUrl && r.productUrl);
  } finally {
    await browser.close();
  }
}
