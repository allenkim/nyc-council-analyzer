import { mkdir, writeFile, readFile, unlink, stat } from "fs/promises";
import { join } from "path";

export type ImageFolder = "selfies" | "outfits" | "feed" | "quiz-assets";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "data");
const IMAGES_DIR = join(DATA_DIR, "images");

/**
 * Save an image buffer to local storage.
 * Returns the relative path (e.g. "selfies/abc123.jpg").
 */
export async function saveImage(
  buffer: Buffer,
  folder: ImageFolder,
  filename: string
): Promise<string> {
  const dir = join(IMAGES_DIR, folder);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, filename);
  await writeFile(filePath, buffer);
  return `${folder}/${filename}`;
}

/**
 * Get the absolute filesystem path for a relative image path.
 */
export function getImageAbsolutePath(relativePath: string): string {
  return join(IMAGES_DIR, relativePath);
}

/**
 * Read an image from local storage. Returns the buffer and detected mime type.
 */
export async function readImage(
  relativePath: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const absPath = getImageAbsolutePath(relativePath);
  const buffer = await readFile(absPath);
  const ext = relativePath.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return { buffer, mimeType: mimeMap[ext] || "application/octet-stream" };
}

/**
 * Delete an image from local storage.
 */
export async function deleteImage(relativePath: string): Promise<void> {
  const absPath = getImageAbsolutePath(relativePath);
  try {
    await unlink(absPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/**
 * Check if an image exists.
 */
export async function imageExists(relativePath: string): Promise<boolean> {
  try {
    await stat(getImageAbsolutePath(relativePath));
    return true;
  } catch {
    return false;
  }
}
