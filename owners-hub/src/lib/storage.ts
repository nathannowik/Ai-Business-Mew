import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024;

const ALLOWED_PREFIXES = ["image/", "text/"];
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/postscript",
  "image/vnd.adobe.photoshop",
]);
const ALLOWED_EXTENSIONS = new Set([".psd", ".ai", ".key", ".pages", ".heic", ".procreate", ".canva"]);

export function isAllowedUpload(fileName: string, mimeType: string): boolean {
  if (mimeType.startsWith("video/") || mimeType.startsWith("audio/")) return false;
  if (ALLOWED_PREFIXES.some((p) => mimeType.startsWith(p)) || ALLOWED_TYPES.has(mimeType)) return true;
  return ALLOWED_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

export async function saveUpload(data: Buffer, fileName: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(fileName).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 12);
  const storedName = `${randomUUID()}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, storedName), data);
  return storedName;
}

export async function readUpload(storedName: string): Promise<Buffer> {
  return readFile(path.join(UPLOAD_DIR, path.basename(storedName)));
}

export async function deleteUpload(storedName: string) {
  await unlink(path.join(UPLOAD_DIR, path.basename(storedName))).catch(() => {});
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
