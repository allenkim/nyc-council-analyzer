import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const DATA_DIR = join(import.meta.dirname, '../../fashion-data/looks');
const IMAGES_DIR = join(DATA_DIR, 'images');
const REJECTED_DIR = join(IMAGES_DIR, 'rejected');
const CATALOG_PATH = join(DATA_DIR, 'looks-catalog.json');

const PROMPT = `Classify this fashion image into ONE of these categories. Reply with ONLY the category letter.

A - GOOD: A natural photo of ONE person wearing an outfit in a real setting (street, indoors, outdoors). Real photography, candid or posed. No heavy text overlays.

B - BAD (collage/grid): Multiple people or multiple outfits arranged in a grid, lookbook layout, or side-by-side comparison.

C - BAD (cutout/composite): Person(s) cut out from background and placed on white, plain, or artificial background. Looks edited/composited, not a real photo.

D - BAD (annotated/poster): Has significant text overlays, labels pointing to clothing items, watermarks covering the image, magazine-style layout, or infographic style.

E - BAD (other): Illustration, drawing, AI-generated looking, meme, screenshot, or anything that isn't a natural photograph of a real person.

Reply with ONLY one letter: A, B, C, D, or E`;

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

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const raw = await readFile(CATALOG_PATH, 'utf-8');
  const catalog: LooksCatalog = JSON.parse(raw);

  await mkdir(REJECTED_DIR, { recursive: true });

  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, error: 0 };
  const rejectedIds = new Set<string>();

  for (let i = 0; i < catalog.items.length; i++) {
    const item = catalog.items[i];
    const imagePath = join(IMAGES_DIR, item.filename);

    let imageData: Buffer;
    try {
      imageData = await readFile(imagePath);
    } catch {
      console.log(`[${i + 1}/${catalog.items.length}] SKIP (missing) ${item.filename}`);
      counts.error++;
      continue;
    }

    const ext = item.filename.split('.').pop() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    try {
      const result = await model.generateContent([
        { text: PROMPT },
        { inlineData: { data: imageData.toString('base64'), mimeType } },
      ]);

      const answer = result.response.text().trim().toUpperCase().charAt(0);

      if (answer === 'A') {
        counts.A++;
        console.log(`[${i + 1}/${catalog.items.length}] ✓ GOOD  ${item.filename} (${item.aesthetic})`);
      } else {
        const reason = answer === 'B' ? 'collage' : answer === 'C' ? 'cutout' : answer === 'D' ? 'annotated' : 'other';
        counts[answer as keyof typeof counts] = ((counts[answer as keyof typeof counts] as number) || 0) + 1;
        rejectedIds.add(item.id);
        await rename(imagePath, join(REJECTED_DIR, item.filename));
        console.log(`[${i + 1}/${catalog.items.length}] ✗ ${reason.toUpperCase().padEnd(9)} ${item.filename} (${item.aesthetic})`);
      }
    } catch (err) {
      console.error(`[${i + 1}/${catalog.items.length}] ERROR ${item.filename}:`, err);
      counts.error++;
    }

    // Rate limit
    if ((i + 1) % 15 === 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Update catalog
  const originalCount = catalog.items.length;
  catalog.items = catalog.items.filter((item) => !rejectedIds.has(item.id));
  catalog.updatedAt = new Date().toISOString();
  await writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log('STRICT CLASSIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Good (natural photo):  ${counts.A}`);
  console.log(`  Collage/grid:          ${counts.B}`);
  console.log(`  Cutout/composite:      ${counts.C}`);
  console.log(`  Annotated/poster:      ${counts.D}`);
  console.log(`  Other:                 ${counts.E}`);
  console.log(`  Errors/missing:        ${counts.error}`);
  console.log(`  Catalog: ${originalCount} → ${catalog.items.length} items`);
  console.log(`  Rejected images moved to: ${REJECTED_DIR}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
