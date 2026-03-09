import { writeFile } from 'fs/promises';
import { join } from 'path';
import { loadCatalog, DATA_DIR } from './catalog.js';

async function main() {
  const catalog = await loadCatalog();

  if (catalog.items.length === 0) {
    console.log('Catalog is empty.');
    return;
  }

  const headers = [
    'id', 'filename', 'source', 'sourceUrl',
    'brand', 'name', 'price', 'currency', 'material',
    'aiCategory', 'aiDescription', 'aiBrand', 'aiPriceEstimate', 'aiMaterial',
    'aiStyle', 'aiColors', 'aiGender', 'aiSeason',
    'enrichedAt', 'createdAt',
  ];

  const escape = (val: unknown): string => {
    if (val == null) return '';
    const s = Array.isArray(val) ? val.join('; ') : String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = catalog.items.map((item) =>
    headers.map((h) => escape((item as unknown as Record<string, unknown>)[h])).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const outPath = join(DATA_DIR, 'catalog.csv');
  await writeFile(outPath, csv);
  console.log(`Exported ${catalog.items.length} items to ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
