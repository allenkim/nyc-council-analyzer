import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { IMAGES_DIR } from './catalog.js';

export async function downloadImage(url: string, id: string): Promise<string | null> {
  try {
    await mkdir(IMAGES_DIR, { recursive: true });

    // Fix protocol-relative URLs
    if (url.startsWith('//')) url = 'https:' + url;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.error(`[download] Failed to fetch ${url}: ${res.status}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = guessExtension(res.headers.get('content-type') || '', url);
    const filename = `${id}.${ext}`;
    await writeFile(join(IMAGES_DIR, filename), buffer);

    console.log(`[download] Saved ${filename} (${(buffer.length / 1024).toFixed(0)}KB)`);
    return filename;
  } catch (err) {
    console.error(`[download] Error downloading ${url}:`, err);
    return null;
  }
}

function guessExtension(contentType: string, url: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  const urlExt = url.split('?')[0].split('.').pop()?.toLowerCase();
  if (urlExt && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExt)) return urlExt;
  return 'jpg';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Random delay between min and max ms to look human */
export function humanDelay(minMs = 500, maxMs = 2000): Promise<void> {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}
