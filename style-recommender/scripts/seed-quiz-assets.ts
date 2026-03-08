/**
 * Seed quiz visual grid images from Unsplash and Pexels.
 *
 * Downloads curated photos for each visual-grid option and saves them
 * to data/images/quiz-assets/. Run once during setup:
 *
 *   npx tsx scripts/seed-quiz-assets.ts
 */

import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve(process.cwd(), "data", "images", "quiz-assets");

interface PhotoSource {
  provider: "unsplash" | "pexels";
  id: string;
  description: string;
}

// Curated photos for each quiz visual-grid option.
// Format: questionId_optionValue -> { provider, id, description }
const PHOTO_MAP: Record<string, PhotoSource> = {
  // preferredFit (Unsplash)
  "preferredFit_slim": { provider: "unsplash", id: "photo-1519085360753-af0119f7cbe7", description: "man in slim fit suit" },
  "preferredFit_regular": { provider: "unsplash", id: "photo-1516826957135-700dedea698c", description: "man in regular fit casual" },
  "preferredFit_relaxed": { provider: "unsplash", id: "photo-1556821840-3a63f95609a7", description: "relaxed oversized streetwear" },

  // patterns
  "patterns_solid": { provider: "unsplash", id: "photo-1521572163474-6864f9cf17ab", description: "plain white tee minimal" },
  "patterns_stripes": { provider: "pexels", id: "1756196", description: "man wearing striped shirt" },
  "patterns_plaid": { provider: "unsplash", id: "photo-1608234808654-2a8875faa7fd", description: "plaid flannel" },
  "patterns_floral": { provider: "pexels", id: "13096946", description: "man in floral hawaiian shirt" },
  "patterns_graphic": { provider: "unsplash", id: "photo-1576566588028-4147f3842f27", description: "graphic tee" },
  "patterns_geometric": { provider: "pexels", id: "11402060", description: "man in patterned knit sweater" },

  // styleVibes
  "styleVibes_minimalist": { provider: "pexels", id: "9558927", description: "man in clean white tee, minimal" },
  "styleVibes_streetwear": { provider: "pexels", id: "12689693", description: "man in black hoodie with cap, urban alley" },
  "styleVibes_classic": { provider: "unsplash", id: "photo-1617137984095-74e4e5e3613f", description: "classic preppy" },
  "styleVibes_rugged": { provider: "unsplash", id: "photo-1611312449412-6cefac5dc3e4", description: "rugged workwear" },
  "styleVibes_athleisure": { provider: "pexels", id: "17883716", description: "man in hoodie at gym" },
  "styleVibes_smart-casual": { provider: "unsplash", id: "photo-1507003211169-0a1dd7228f2d", description: "smart casual" },
  "styleVibes_avant-garde": { provider: "pexels", id: "28609628", description: "fashion model in avant-garde motion shot" },
  "styleVibes_bohemian": { provider: "pexels", id: "10667859", description: "man in bohemian patchwork outfit" },
  "styleVibes_scandinavian": { provider: "pexels", id: "3027174", description: "man in beige coat, neutral tones" },
  "styleVibes_techwear": { provider: "pexels", id: "8718347", description: "man in dark coat, smoky cyberpunk" },
  "styleVibes_ivy": { provider: "unsplash", id: "photo-1593030761757-71fae45fa0e7", description: "ivy league trad" },
  "styleVibes_coastal": { provider: "pexels", id: "34668918", description: "young man on beach in summer attire" },
};

function getDownloadUrl(source: PhotoSource): string {
  if (source.provider === "unsplash") {
    return `https://images.unsplash.com/${source.id}?w=600&h=400&fit=crop&auto=format&q=80`;
  }
  return `https://images.pexels.com/photos/${source.id}/pexels-photo-${source.id}.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop`;
}

async function downloadImage(source: PhotoSource, filename: string): Promise<boolean> {
  const url = getDownloadUrl(source);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.error(`  FAIL ${filename}: HTTP ${res.status}`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
    console.log(`  OK   ${filename} (${(buffer.length / 1024).toFixed(0)} KB) [${source.provider}]`);
    return true;
  } catch (err) {
    console.error(`  FAIL ${filename}:`, (err as Error).message);
    return false;
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Downloading ${Object.keys(PHOTO_MAP).length} quiz images to ${OUT_DIR}\n`);

  let ok = 0;
  let fail = 0;

  for (const [key, source] of Object.entries(PHOTO_MAP)) {
    const filename = `${key}.jpg`;
    const success = await downloadImage(source, filename);
    if (success) ok++;
    else fail++;
  }

  console.log(`\nDone: ${ok} downloaded, ${fail} failed`);

  // Generate the mapping JSON for the frontend
  const mapping: Record<string, string> = {};
  for (const key of Object.keys(PHOTO_MAP)) {
    mapping[key] = `quiz-assets/${key}.jpg`;
  }
  const mappingPath = path.join(OUT_DIR, "mapping.json");
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`Mapping written to ${mappingPath}`);
}

main();
