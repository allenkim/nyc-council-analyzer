import { readFile, mkdir, rename } from 'fs/promises';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const DATA_DIR = join(import.meta.dirname, '../../fashion-data/looks');
const IMAGES_DIR = join(DATA_DIR, 'images');
const PRODUCT_DIR = join(IMAGES_DIR, 'product-only');
const CATALOG_PATH = join(DATA_DIR, 'looks-catalog.json');

const PROMPT = `Look at this image and classify it. Does it show a PERSON wearing clothes (full body, half body, or street style photo), or does it show just the CLOTHES THEMSELVES (flat lay, product shot, hanger, mannequin, poster, collage, or text graphic)?

Reply with ONLY one word: "person" or "product"`;

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
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const raw = await readFile(CATALOG_PATH, 'utf-8');
  const catalog: LooksCatalog = JSON.parse(raw);

  await mkdir(PRODUCT_DIR, { recursive: true });

  let personCount = 0;
  let productCount = 0;
  let errorCount = 0;

  const productItems: Set<string> = new Set();

  for (let i = 0; i < catalog.items.length; i++) {
    const item = catalog.items[i];
    const imagePath = join(IMAGES_DIR, item.filename);

    let imageData: Buffer;
    try {
      imageData = await readFile(imagePath);
    } catch {
      // Image might already be moved or missing
      console.log(`[${i + 1}/${catalog.items.length}] SKIP (missing) ${item.filename}`);
      errorCount++;
      continue;
    }

    const ext = item.filename.split('.').pop() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    try {
      const result = await model.generateContent([
        { text: PROMPT },
        { inlineData: { data: imageData.toString('base64'), mimeType } },
      ]);

      const answer = result.response.text().trim().toLowerCase();

      if (answer.includes('product')) {
        // Move to product-only subfolder
        await rename(imagePath, join(PRODUCT_DIR, item.filename));
        productItems.add(item.id);
        productCount++;
        console.log(`[${i + 1}/${catalog.items.length}] PRODUCT → ${item.filename} (${item.aesthetic})`);
      } else {
        personCount++;
        console.log(`[${i + 1}/${catalog.items.length}] PERSON  ✓ ${item.filename} (${item.aesthetic})`);
      }
    } catch (err) {
      console.error(`[${i + 1}/${catalog.items.length}] ERROR ${item.filename}:`, err);
      errorCount++;
    }

    // Small delay to respect rate limits
    if ((i + 1) % 10 === 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Update catalog: remove product-only items
  const originalCount = catalog.items.length;
  catalog.items = catalog.items.filter((item) => !productItems.has(item.id));
  catalog.updatedAt = new Date().toISOString();

  await import('fs/promises').then((fs) =>
    fs.writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2)),
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log('CLASSIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Person (kept):    ${personCount}`);
  console.log(`  Product (moved):  ${productCount}`);
  console.log(`  Errors/missing:   ${errorCount}`);
  console.log(`  Catalog: ${originalCount} → ${catalog.items.length} items`);
  console.log(`  Product images moved to: ${PRODUCT_DIR}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
