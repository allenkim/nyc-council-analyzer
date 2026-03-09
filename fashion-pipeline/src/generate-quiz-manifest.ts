import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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
}

interface QuizManifest {
  pools: Record<string, { filename: string }[]>;
  generatedAt: string;
}

const IMAGES_PER_AESTHETIC = 5;

/** Fisher-Yates shuffle (in-place) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function main() {
  const dataDir = join(import.meta.dirname, '..', '..', 'fashion-data', 'looks');
  const catalogPath = join(dataDir, 'looks-catalog.json');
  const outputPath = join(dataDir, 'quiz-manifest.json');

  const raw = await readFile(catalogPath, 'utf-8');
  const catalog: LooksCatalog = JSON.parse(raw);

  // Group items by aesthetic
  const byAesthetic = new Map<string, LookItem[]>();
  for (const item of catalog.items) {
    const list = byAesthetic.get(item.aesthetic) || [];
    list.push(item);
    byAesthetic.set(item.aesthetic, list);
  }

  // Shuffle items within each aesthetic, then take top N
  const pools: Record<string, { filename: string }[]> = {};
  for (const [aesthetic, items] of byAesthetic.entries()) {
    shuffle(items);
    pools[aesthetic] = items.slice(0, IMAGES_PER_AESTHETIC).map((item) => ({
      filename: item.filename,
    }));
  }

  const manifest: QuizManifest = {
    pools,
    generatedAt: new Date().toISOString(),
  };

  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + '\n');

  // Summary
  const aesthetics = Object.keys(pools).sort();
  console.log(`Catalog: ${catalog.items.length} items across ${aesthetics.length} aesthetics`);
  let totalImages = 0;
  for (const aes of aesthetics) {
    console.log(`  ${aes}: ${pools[aes].length} images (of ${byAesthetic.get(aes)!.length} available)`);
    totalImages += pools[aes].length;
  }
  console.log(`\nTotal pool images: ${totalImages}`);
  console.log(`Written to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
