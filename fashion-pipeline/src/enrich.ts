import { readFile } from 'fs/promises';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadCatalog, saveCatalog, IMAGES_DIR } from './catalog.js';
import type { FashionItem } from './types.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

function getGeminiModel() {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

const ENRICHMENT_PROMPT = `Analyze this fashion product image. Return ONLY a JSON object with these fields:
{
  "category": "category/subcategory (e.g. shoes/sneakers, tops/hoodie, bags/backpack)",
  "description": "2-3 sentence description of the item",
  "brand": "brand name if identifiable, or null",
  "priceEstimate": estimated retail price in USD as a number,
  "material": "primary material (e.g. leather, cotton, polyester, suede)",
  "style": ["array", "of", "style", "tags"],
  "colors": ["array", "of", "colors"],
  "gender": "mens or womens or unisex",
  "season": "spring/summer or fall/winter or all-season"
}`;

async function enrichItem(model: ReturnType<typeof getGeminiModel>, item: FashionItem): Promise<boolean> {
  const imagePath = join(IMAGES_DIR, item.filename);

  let imageData: Buffer;
  try {
    imageData = await readFile(imagePath);
  } catch {
    console.error(`[enrich] Image not found: ${item.filename}`);
    return false;
  }

  const ext = item.filename.split('.').pop() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  try {
    const result = await model.generateContent([
      { inlineData: { data: imageData.toString('base64'), mimeType } },
      { text: ENRICHMENT_PROMPT },
    ]);

    const text = result.response.text();
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : text;
    const data = JSON.parse(jsonStr.trim());

    // AI fills gaps — scraped metadata is authoritative
    item.aiCategory = data.category;
    item.aiDescription = data.description;
    if (!item.brand) item.aiBrand = data.brand;
    if (!item.price) item.aiPriceEstimate = data.priceEstimate;
    if (!item.material) item.aiMaterial = data.material;
    item.aiStyle = data.style;
    item.aiColors = data.colors;
    item.aiGender = data.gender;
    item.aiSeason = data.season;
    item.enrichedAt = new Date().toISOString();

    console.log(`[enrich] ${item.filename}: ${data.category} — ${data.colors?.join(', ')}`);
    return true;
  } catch (err) {
    console.error(`[enrich] Error processing ${item.filename}:`, err);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 20;

  const catalog = await loadCatalog();
  const unenriched = catalog.items.filter((item) => !item.enrichedAt);

  if (unenriched.length === 0) {
    console.log('All items already enriched.');
    return;
  }

  const batch = unenriched.slice(0, limit);
  console.log(`\nEnriching ${batch.length} items (${unenriched.length} unenriched total)\n`);

  const model = getGeminiModel();
  let success = 0;

  for (const item of batch) {
    const ok = await enrichItem(model, item);
    if (ok) success++;
    // Rate limit: ~1 request per second
    await new Promise((r) => setTimeout(r, 1000));
  }

  await saveCatalog(catalog);
  console.log(`\nDone: ${success}/${batch.length} enriched successfully`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
