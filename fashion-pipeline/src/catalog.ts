import { readFile, writeFile, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';
import type { Catalog, FashionItem, ScrapeResult } from './types.js';

const DATA_DIR = join(import.meta.dirname, '../../fashion-data');
const CATALOG_PATH = join(DATA_DIR, 'catalog.json');
const IMAGES_DIR = join(DATA_DIR, 'images');

export { DATA_DIR, CATALOG_PATH, IMAGES_DIR };

export async function loadCatalog(): Promise<Catalog> {
  try {
    const raw = await readFile(CATALOG_PATH, 'utf-8');
    return JSON.parse(raw) as Catalog;
  } catch {
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

export async function saveCatalog(catalog: Catalog): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  catalog.updatedAt = new Date().toISOString();
  await writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2));
}

export function makeId(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 12);
}

export function hasItem(catalog: Catalog, sourceUrl: string): boolean {
  const id = makeId(sourceUrl);
  return catalog.items.some((item) => item.id === id);
}

export function addItem(catalog: Catalog, result: ScrapeResult, filename: string): FashionItem {
  const item: FashionItem = {
    id: makeId(result.productUrl),
    filename,
    sourceUrl: result.productUrl,
    source: new URL(result.productUrl).hostname.replace('www.', '').split('.')[0],
    brand: result.brand,
    name: result.name,
    price: result.price,
    currency: result.currency,
    material: result.material,
    createdAt: new Date().toISOString(),
  };
  catalog.items.push(item);
  return item;
}
