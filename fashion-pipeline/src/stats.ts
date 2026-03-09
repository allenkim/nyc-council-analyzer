import { loadCatalog } from './catalog.js';

async function main() {
  const catalog = await loadCatalog();
  const items = catalog.items;

  if (items.length === 0) {
    console.log('Catalog is empty.');
    return;
  }

  const enriched = items.filter((i) => i.enrichedAt).length;
  const sources = new Map<string, number>();
  const brands = new Map<string, number>();
  const categories = new Map<string, number>();

  for (const item of items) {
    sources.set(item.source, (sources.get(item.source) || 0) + 1);
    const brand = item.brand || item.aiBrand;
    if (brand) brands.set(brand, (brands.get(brand) || 0) + 1);
    if (item.aiCategory) categories.set(item.aiCategory, (categories.get(item.aiCategory) || 0) + 1);
  }

  console.log(`\n=== Fashion Collection Stats ===\n`);
  console.log(`Total items:  ${items.length}`);
  console.log(`Enriched:     ${enriched}/${items.length}`);
  console.log(`Last updated: ${catalog.updatedAt}\n`);

  console.log(`--- Sources ---`);
  for (const [source, count] of [...sources.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source}: ${count}`);
  }

  console.log(`\n--- Top Brands ---`);
  for (const [brand, count] of [...brands.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${brand}: ${count}`);
  }

  if (categories.size > 0) {
    console.log(`\n--- Categories ---`);
    for (const [cat, count] of [...categories.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat}: ${count}`);
    }
  }

  console.log('');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
