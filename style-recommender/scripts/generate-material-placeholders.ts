/**
 * Generate material texture swatch images for the quiz visual grid.
 *
 * Downloads curated fabric texture photos from Pexels, then saves them
 * to data/images/quiz-assets/ as materials_*.jpg and avoidMaterials_*.jpg.
 *
 * Run once:
 *   npx tsx scripts/generate-material-placeholders.ts
 *
 * For avoidMaterials options that overlap with materials (leather, wool, silk),
 * the same image is reused via file copy.
 */

import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve(process.cwd(), "data", "images", "quiz-assets");

// All photos sourced from Pexels (free, no attribution required).
// Each ID verified to return 200 and visually confirmed as the correct texture.
const MATERIAL_PHOTOS: Record<string, { id: string; description: string }> = {
  cotton:    { id: "5908251", description: "light brown cotton fabric close-up" },
  linen:     { id: "7794365", description: "natural beige linen texture close-up" },
  denim:     { id: "4049757", description: "blue denim fabric weave close-up" },
  wool:      { id: "1487711", description: "blue knit wool textile close-up" },
  leather:   { id: "30037103", description: "rich brown leather texture background" },
  cashmere:  { id: "3262937", description: "soft knitted cashmere sweaters" },
  silk:      { id: "7946623", description: "white satin silk fabric drape" },
  corduroy:  { id: "7794356", description: "olive wrinkled corduroy fabric" },
  fleece:    { id: "14361936", description: "soft fuzzy fleece fabric close-up" },
  technical: { id: "29060193", description: "dark gray woven technical fabric" },
  suede:     { id: "4554339", description: "brown matte cloth texture close-up" },
  polyester: { id: "4862910", description: "smooth beige polyester fabric" },
};

// avoidMaterials that reuse the same image as their materials_ counterpart
const AVOID_COPIES: string[] = ["leather", "wool", "silk"];

// avoidMaterials that need their own download (polyester isn't in materials_)
const AVOID_UNIQUE = ["polyester"];

function getPexelsUrl(id: string): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop`;
}

// Minimal valid 1x1 white JPEG — fallback if download fails
const FALLBACK_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////" +
  "2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB" +
  "/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/a" +
  "AAwDAQACEQMRAD8AKwA//9k=",
  "base64"
);

async function downloadImage(id: string, filename: string): Promise<boolean> {
  const url = getPexelsUrl(id);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      console.error(`  FAIL ${filename}: HTTP ${res.status}`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 500) {
      console.error(`  FAIL ${filename}: response too small (${buffer.length} bytes)`);
      return false;
    }
    fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
    console.log(`  OK   ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (err) {
    console.error(`  FAIL ${filename}:`, (err as Error).message);
    return false;
  }
}

function writeFallback(filename: string): void {
  fs.writeFileSync(path.join(OUT_DIR, filename), FALLBACK_JPEG);
  console.log(`  PLACEHOLDER ${filename}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  let fallbacks = 0;

  // 1. Download materials_ images
  console.log("Downloading material textures...\n");
  for (const [mat, { id }] of Object.entries(MATERIAL_PHOTOS)) {
    const filename = `materials_${mat}.jpg`;
    const success = await downloadImage(id, filename);
    if (success) ok++;
    else { writeFallback(filename); fallbacks++; }
  }

  // 2. Download unique avoidMaterials images
  console.log("\nDownloading avoidMaterials textures...\n");
  for (const mat of AVOID_UNIQUE) {
    const filename = `avoidMaterials_${mat}.jpg`;
    const { id } = MATERIAL_PHOTOS[mat];
    const success = await downloadImage(id, filename);
    if (success) ok++;
    else { writeFallback(filename); fallbacks++; }
  }

  // 3. Copy shared avoidMaterials from materials_ versions
  console.log("\nCopying shared avoidMaterials...\n");
  for (const mat of AVOID_COPIES) {
    const srcFile = path.join(OUT_DIR, `materials_${mat}.jpg`);
    const dstFile = path.join(OUT_DIR, `avoidMaterials_${mat}.jpg`);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, dstFile);
      console.log(`  COPY avoidMaterials_${mat}.jpg <- materials_${mat}.jpg`);
    } else {
      writeFallback(`avoidMaterials_${mat}.jpg`);
      fallbacks++;
    }
  }

  // 4. Update mapping.json
  const mappingPath = path.join(OUT_DIR, "mapping.json");
  const existing = fs.existsSync(mappingPath)
    ? JSON.parse(fs.readFileSync(mappingPath, "utf-8"))
    : {};

  for (const mat of Object.keys(MATERIAL_PHOTOS)) {
    existing[`materials_${mat}`] = `quiz-assets/materials_${mat}.jpg`;
  }
  for (const mat of [...AVOID_UNIQUE, ...AVOID_COPIES]) {
    existing[`avoidMaterials_${mat}`] = `quiz-assets/avoidMaterials_${mat}.jpg`;
  }

  fs.writeFileSync(mappingPath, JSON.stringify(existing, null, 2));
  console.log(`\nMapping updated: ${mappingPath}`);

  console.log(`\nDone: ${ok} downloaded, ${fallbacks} fallback placeholders`);
}

main().catch(console.error);
