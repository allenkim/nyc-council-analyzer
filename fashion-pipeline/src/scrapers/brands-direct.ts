import { chromium } from 'playwright';
import { humanDelay, sleep } from '../download.js';
import type { ScrapeResult } from '../types.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

interface BrandConfig {
  name: string;
  /** Shopify JSON API base (e.g. 'https://corridornyc.com'), skips browser entirely */
  shopifyBase?: string;
  /** Shopify collection handles to scrape */
  shopifyCollections?: string[];
  /** Browser-based: URLs to visit */
  urls?: string[];
  /** URL substrings that indicate a product link (any match = product) */
  productPatterns?: string[];
  /** Wait strategy for browser scraping */
  wait?: 'domcontentloaded' | 'networkidle';
  /** Pinterest search query (fallback for hard-to-scrape sites) */
  pinterestQuery?: string;
}

const BRANDS: BrandConfig[] = [
  // === Shopify API brands (fast, reliable) ===
  {
    name: 'Alex Mill',
    shopifyBase: 'https://www.alexmill.com',
    shopifyCollections: ['mens-new-arrivals', 'mens-shirts', 'mens-tees-polos'],
  },
  {
    name: 'Corridor',
    shopifyBase: 'https://corridornyc.com',
    shopifyCollections: ['all'],
  },
  {
    name: 'Percival',
    shopifyBase: 'https://www.percivalclo.com',
    shopifyCollections: ['all'],
  },
  {
    name: 'NN07',
    pinterestQuery: 'NN07 men clothing fashion',
  },
  {
    name: 'Sunspel',
    shopifyBase: 'https://www.sunspel.com',
    shopifyCollections: ['mens-t-shirts', 'mens-shirts', 'mens-polos'],
  },

  // === Browser-based brands ===
  {
    name: 'Uniqlo',
    urls: [
      'https://www.uniqlo.com/us/en/men/tops',
      'https://www.uniqlo.com/us/en/men/bottoms',
      'https://www.uniqlo.com/us/en/men/outerwear-and-blazers',
    ],
    productPatterns: ['/products/'],
  },
  {
    name: 'COS',
    pinterestQuery: 'COS store men clothing fashion',
  },
  {
    name: 'Everlane',
    urls: [
      'https://www.everlane.com/collections/mens-tees',
      'https://www.everlane.com/collections/mens-bottoms',
      'https://www.everlane.com/collections/mens-outerwear',
    ],
    productPatterns: ['/products/'],
  },
  {
    name: 'Todd Snyder',
    pinterestQuery: 'Todd Snyder men clothing fashion',
  },
  {
    name: 'Buck Mason',
    urls: [
      'https://www.buckmason.com/collections/men-new-arrivals',
      'https://www.buckmason.com/collections/men-tees',
    ],
    productPatterns: ['/products/', '/tees/', '/shirts/'],
  },
  {
    name: 'J.Crew',
    pinterestQuery: 'J.Crew men clothing fashion',
  },
  {
    name: 'Club Monaco',
    pinterestQuery: 'Club Monaco men clothing fashion',
  },
  {
    name: 'Mango',
    pinterestQuery: 'Mango man clothing fashion',
  },
  {
    name: 'Quince',
    pinterestQuery: 'Quince brand men clothing fashion',
  },
  {
    name: 'Saturdays NYC',
    shopifyBase: 'https://www.saturdaysnyc.com',
    shopifyCollections: ['mens-apparel'],
  },
  {
    name: 'Officine Générale',
    shopifyBase: 'https://www.officinegenerale.com',
    shopifyCollections: ['og-homme-toute-la-collection'],
  },
  {
    name: 'A.P.C.',
    shopifyBase: 'https://www.apc-us.com',
    shopifyCollections: ['men-all-collection'],
  },
  {
    name: 'Norse Projects',
    pinterestQuery: 'Norse Projects men clothing fashion',
  },
  {
    name: 'Carhartt WIP',
    pinterestQuery: 'Carhartt WIP men clothing fashion',
  },
  {
    name: 'Reiss',
    pinterestQuery: 'Reiss men clothing fashion',
  },
  {
    name: 'Lululemon',
    pinterestQuery: 'Lululemon men clothing fashion',
  },

  // === Expanded coverage: Shopify API ===
  {
    name: 'Ted Baker',
    shopifyBase: 'https://www.tedbaker.com',
    shopifyCollections: ['all-menswear'],
  },
  {
    name: 'Lemaire',
    shopifyBase: 'https://www.lemaire.fr',
    shopifyCollections: ['men-ready-to-wear-all'],
  },
  {
    name: 'Stussy',
    shopifyBase: 'https://www.stussy.com',
    shopifyCollections: ['all'],
  },
  {
    name: 'Scotch & Soda',
    shopifyBase: 'https://www.scotchandsoda.com',
    shopifyCollections: ['men'],
  },

  // === Expanded coverage: Pinterest fallback ===
  {
    name: 'H&M',
    pinterestQuery: 'H&M men clothing fashion',
  },
  {
    name: 'Zara',
    pinterestQuery: 'Zara men clothing fashion',
  },
  {
    name: 'GAP',
    pinterestQuery: 'GAP men clothing fashion',
  },
  {
    name: 'ASOS',
    pinterestQuery: 'ASOS men clothing fashion',
  },
  {
    name: 'Banana Republic',
    pinterestQuery: 'Banana Republic men clothing fashion',
  },
  {
    name: 'Abercrombie & Fitch',
    pinterestQuery: 'Abercrombie Fitch men clothing fashion',
  },
  {
    name: 'Massimo Dutti',
    pinterestQuery: 'Massimo Dutti men clothing fashion',
  },
  {
    name: 'ARKET',
    pinterestQuery: 'ARKET men clothing fashion',
  },
  {
    name: 'Bonobos',
    pinterestQuery: 'Bonobos men clothing fashion',
  },
  {
    name: 'AllSaints',
    pinterestQuery: 'AllSaints men clothing fashion',
  },
  {
    name: 'Theory',
    pinterestQuery: 'Theory men clothing fashion',
  },
  {
    name: 'Rag & Bone',
    pinterestQuery: 'Rag and Bone men clothing fashion',
  },
  {
    name: 'Paul Smith',
    pinterestQuery: 'Paul Smith men clothing fashion',
  },
  {
    name: 'Maison Kitsuné',
    pinterestQuery: 'Maison Kitsune men clothing fashion',
  },
  {
    name: 'Common Projects',
    pinterestQuery: 'Common Projects sneakers men fashion',
  },
  {
    name: 'Golden Goose',
    pinterestQuery: 'Golden Goose sneakers men fashion',
  },
  {
    name: 'New Balance',
    pinterestQuery: 'New Balance men fashion outfit',
  },
];

// ==================== Shopify JSON API scraper ====================

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  images: { src: string }[];
  variants: { price: string }[];
}

async function scrapeShopifyApi(config: BrandConfig, limit: number): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  const seen = new Set<string>();

  for (const collection of config.shopifyCollections || []) {
    if (results.length >= limit) break;

    const url = `${config.shopifyBase}/collections/${collection}/products.json?limit=${limit * 2}`;
    console.log(`[${config.name}] Fetching ${url}`);

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.error(`[${config.name}] ${res.status} for ${url}`);
        continue;
      }

      const data = (await res.json()) as { products: ShopifyProduct[] };

      for (const product of data.products) {
        if (results.length >= limit) break;
        if (seen.has(product.handle)) continue;
        seen.add(product.handle);

        const image = product.images[0];
        if (!image?.src) continue;

        const productUrl = `${config.shopifyBase}/products/${product.handle}`;
        const price = parseFloat(product.variants[0]?.price || '0');

        results.push({
          imageUrl: image.src,
          productUrl,
          brand: config.name,
          name: product.title,
          price: price > 0 ? price : undefined,
          currency: 'USD',
        });
      }

      console.log(`[${config.name}] Got ${data.products.length} products from ${collection} (total: ${results.length})`);
    } catch (err: any) {
      console.error(`[${config.name}] Error fetching ${url}: ${err.message || err}`);
    }

    await humanDelay(1000, 2000);
  }

  return results.slice(0, limit);
}

// ==================== Browser-based scraper ====================

async function scrapeBrowser(config: BrandConfig, limit: number): Promise<ScrapeResult[]> {
  const browser = await chromium.launch({ headless: true });
  const results: ScrapeResult[] = [];

  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    for (const url of config.urls || []) {
      if (results.length >= limit) break;

      console.log(`[${config.name}] Navigating to ${url}`);
      try {
        await page.goto(url, {
          waitUntil: config.wait || 'domcontentloaded',
          timeout: 45000,
        });
        await humanDelay(3000, 5000);

        // Scroll to trigger lazy loading
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight));
          await humanDelay(800, 1500);
        }
        await humanDelay(2000, 3000);

        const products = await page.evaluate((cfg) => {
          const items: { imageUrl: string; productUrl: string; name: string; price: string }[] = [];
          const seen = new Set<string>();

          const links = document.querySelectorAll('a[href]');
          for (const link of links) {
            const href = (link as HTMLAnchorElement).href;
            if (!href || seen.has(href)) continue;

            const isProduct = (cfg.productPatterns || []).some((p: string) => href.includes(p));
            if (!isProduct) continue;
            if (href.includes('/collections/') || href.includes('/c/') || href.includes('/category/')) continue;

            // Find image - check multiple sources
            const img = link.querySelector('img') as HTMLImageElement | null;
            if (!img) continue;

            let imgSrc = '';
            // Try data-src first (lazy loading)
            const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-srcset') || '';
            if (dataSrc) {
              imgSrc = dataSrc.split(',').pop()?.trim().split(' ')[0] || '';
            }
            // Then srcset
            if (!imgSrc && img.srcset) {
              const entries = img.srcset.split(',').map(s => s.trim());
              imgSrc = entries[entries.length - 1].split(' ')[0];
            }
            // Finally src
            if (!imgSrc) imgSrc = img.src;

            if (!imgSrc || imgSrc.includes('data:') || imgSrc.includes('svg') || imgSrc.includes('icon')) continue;
            if (imgSrc.startsWith('//')) imgSrc = 'https:' + imgSrc;

            if (img.naturalWidth > 0 && img.naturalWidth < 50) continue;

            const name = img.alt || link.textContent?.trim().split('\n')[0] || '';
            const priceEl = link.closest('[class*="product"], [class*="card"], [data-product], article, li')
              ?.querySelector('[class*="price"], [class*="Price"], [data-price]')
              || link.querySelector('[class*="price"], [class*="Price"]');
            const price = priceEl?.textContent?.trim() || '';

            seen.add(href);
            items.push({ imageUrl: imgSrc, productUrl: href, name: name.slice(0, 200), price });
          }

          return items;
        }, config);

        for (const p of products) {
          if (results.length >= limit) break;
          if (!p.imageUrl || !p.productUrl) continue;

          const priceNum = parseFloat(p.price.replace(/[^0-9.]/g, ''));
          results.push({
            imageUrl: p.imageUrl,
            productUrl: p.productUrl,
            brand: config.name,
            name: p.name,
            price: isNaN(priceNum) ? undefined : priceNum,
            currency: 'USD',
          });
        }

        console.log(`[${config.name}] Found ${products.length} products on ${url} (total: ${results.length})`);
      } catch (err: any) {
        console.error(`[${config.name}] Error on ${url}: ${err.message || err}`);
      }

      await humanDelay(2000, 4000);
    }
  } finally {
    await browser.close();
  }

  return results.slice(0, limit);
}

// ==================== Pinterest-based scraper ====================

/** Resolution tiers to try for Pinterest images, descending quality */
const PINTEREST_RESOLUTIONS = ['/originals/', '/736x/', '/474x/'] as const;

async function scrapePinterest(config: BrandConfig, limit: number): Promise<ScrapeResult[]> {
  const query = config.pinterestQuery!;
  const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
  console.log(`[${config.name}] Pinterest search: ${searchUrl}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('a[href*="/pin/"]', { timeout: 30000 });

    // Dismiss login modal
    await page.evaluate(() => {
      (document.querySelector('[aria-label="close"]') as HTMLElement | null)?.click();
      (document.querySelector('button[aria-label="Close"]') as HTMLElement | null)?.click();
    });
    await sleep(1000);

    let pins: { pinUrl: string; imageUrl: string; altText: string }[] = [];
    let scrollAttempts = 0;

    while (pins.length < limit && scrollAttempts < 10) {
      pins = await page.$$eval('a[href*="/pin/"]', (anchors) => {
        const seen = new Set<string>();
        const results: { pinUrl: string; imageUrl: string; altText: string }[] = [];
        for (const a of anchors) {
          const href = a.getAttribute('href');
          if (!href || !href.startsWith('/pin/')) continue;
          const pinUrl = `https://www.pinterest.com${href}`;
          if (seen.has(pinUrl)) continue;
          seen.add(pinUrl);
          const img = a.querySelector('img');
          if (!img) continue;
          const src = img.getAttribute('src') || '';
          if (!src.includes('pinimg.com')) continue;
          results.push({ pinUrl, imageUrl: src, altText: img.getAttribute('alt') || '' });
        }
        return results;
      });

      console.log(`[${config.name}] Found ${pins.length}/${limit} pins (scroll ${scrollAttempts})`);
      if (pins.length >= limit) break;

      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await humanDelay(1500, 3000);
      scrollAttempts++;
    }

    // Convert pins to ScrapeResults, upgrading thumbnail URLs to best available resolution
    const results: ScrapeResult[] = [];
    for (const pin of pins.slice(0, limit)) {
      let imageUrl = pin.imageUrl;
      if (imageUrl.includes('/236x/')) {
        // Try each resolution tier, use first that doesn't 403
        let found = false;
        for (const res of PINTEREST_RESOLUTIONS) {
          const candidate = pin.imageUrl.replace('/236x/', res);
          try {
            const check = await fetch(candidate, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            if (check.ok) {
              imageUrl = candidate;
              found = true;
              break;
            }
          } catch { /* try next */ }
        }
        if (!found) imageUrl = pin.imageUrl; // fall back to 236x thumbnail
      }

      results.push({
        imageUrl,
        productUrl: pin.pinUrl,
        brand: config.name,
        name: pin.altText.slice(0, 200),
      });
    }

    return results;
  } finally {
    await browser.close();
  }
}

// ==================== Public API ====================

export async function scrapeBrandDirect(brandName: string, limit: number): Promise<ScrapeResult[]> {
  const config = BRANDS.find(b => b.name.toLowerCase() === brandName.toLowerCase());
  if (!config) {
    const valid = BRANDS.map(b => b.name).join(', ');
    throw new Error(`Unknown brand "${brandName}". Valid: ${valid}`);
  }

  console.log(`[${config.name}] Starting scrape (limit: ${limit})`);

  if (config.shopifyBase) {
    return scrapeShopifyApi(config, limit);
  }
  if (config.pinterestQuery) {
    return scrapePinterest(config, limit);
  }
  return scrapeBrowser(config, limit);
}

export function getAvailableBrands(): string[] {
  return BRANDS.map(b => b.name);
}
