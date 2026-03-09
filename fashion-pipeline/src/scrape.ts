import { scrapeSSENSE } from './scrapers/ssense.js';
import { scrapeFarfetch } from './scrapers/farfetch.js';
import { scrapeGrailed } from './scrapers/grailed.js';
import { loadCatalog, saveCatalog, hasItem, addItem, makeId } from './catalog.js';
import { downloadImage } from './download.js';

const SCRAPERS: Record<string, (category: string, limit: number) => Promise<import('./types.js').ScrapeResult[]>> = {
  ssense: scrapeSSENSE,
  farfetch: scrapeFarfetch,
  grailed: scrapeGrailed,
};

async function main() {
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf('--source');
  const categoryIdx = args.indexOf('--category');
  const limitIdx = args.indexOf('--limit');

  const source = sourceIdx >= 0 ? args[sourceIdx + 1] : null;
  const category = categoryIdx >= 0 ? args[categoryIdx + 1] : 'shoes';
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 20;

  if (!source || !SCRAPERS[source]) {
    console.error(`Usage: npm run fashion:scrape -- --source <${Object.keys(SCRAPERS).join('|')}> [--category <cat>] [--limit <n>]`);
    process.exit(1);
  }

  console.log(`\nScraping ${source} / ${category} (limit: ${limit})\n`);

  const catalog = await loadCatalog();
  const scraper = SCRAPERS[source];
  const results = await scraper(category, limit);

  let added = 0;
  let skipped = 0;

  for (const result of results) {
    if (hasItem(catalog, result.productUrl)) {
      skipped++;
      continue;
    }

    const id = makeId(result.productUrl);
    const filename = await downloadImage(result.imageUrl, id);
    if (!filename) continue;

    addItem(catalog, result, filename);
    added++;
  }

  await saveCatalog(catalog);
  console.log(`\nDone: ${added} added, ${skipped} skipped (already in catalog)`);
  console.log(`Catalog now has ${catalog.items.length} items total`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
