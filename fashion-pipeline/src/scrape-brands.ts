import { scrapeBrandDirect, getAvailableBrands } from './scrapers/brands-direct.js';
import { loadCatalog, saveCatalog, hasItem, addItem, makeId } from './catalog.js';
import { downloadImage } from './download.js';

async function main() {
  const args = process.argv.slice(2);
  const brandIdx = args.indexOf('--brand');
  const limitIdx = args.indexOf('--limit');
  const allFlag = args.includes('--all');

  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 5;

  const availableBrands = getAvailableBrands();

  if (!allFlag && brandIdx < 0) {
    console.error(`Usage: npm run fashion:brands -- --brand <name> [--limit <n>]`);
    console.error(`       npm run fashion:brands -- --all [--limit <n>]`);
    console.error(`\nAvailable brands: ${availableBrands.join(', ')}`);
    process.exit(1);
  }

  const brandsToScrape = allFlag ? availableBrands : [args[brandIdx + 1]];

  const catalog = await loadCatalog();
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const brandName of brandsToScrape) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Scraping: ${brandName} (limit: ${limit})`);
    console.log('='.repeat(60));

    try {
      const results = await scrapeBrandDirect(brandName, limit);

      let added = 0;
      let skipped = 0;

      for (const result of results) {
        if (hasItem(catalog, result.productUrl)) {
          skipped++;
          continue;
        }

        const id = makeId(result.productUrl);
        const filename = await downloadImage(result.imageUrl, id);
        if (!filename) {
          totalFailed++;
          continue;
        }

        addItem(catalog, result, filename);
        added++;
      }

      console.log(`[${brandName}] Done: ${added} added, ${skipped} skipped`);
      totalAdded += added;
      totalSkipped += skipped;
    } catch (err) {
      console.error(`[${brandName}] Failed:`, err);
    }
  }

  await saveCatalog(catalog);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total: ${totalAdded} added, ${totalSkipped} skipped, ${totalFailed} failed`);
  console.log(`Catalog now has ${catalog.items.length} items total`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
