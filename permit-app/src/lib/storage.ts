import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// All uploaded and generated files live under the storage directory (git-ignored). We
// store a relative key (e.g. "townships/ab12.pdf") in the DB and resolve it here.
// STORAGE_DIR lets a host point this at a persistent disk (e.g. /data/storage).
const ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), 'storage');

export async function ensureDir(sub: string) {
  await fs.mkdir(path.join(ROOT, sub), { recursive: true });
}

function safeKey(key: string): string {
  // Prevent path traversal; keys are app-generated but be defensive.
  const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
  return normalized.replace(/^[/\\]+/, '');
}

export function absPath(key: string): string {
  return path.join(ROOT, safeKey(key));
}

/** Save bytes under a subfolder, returning the relative storage key. */
export async function saveFile(sub: string, ext: string, bytes: Uint8Array | Buffer): Promise<string> {
  await ensureDir(sub);
  const id = crypto.randomBytes(8).toString('hex');
  const key = `${sub}/${id}${ext.startsWith('.') ? ext : `.${ext}`}`;
  await fs.writeFile(absPath(key), bytes);
  return key;
}

export async function readFile(key: string): Promise<Buffer> {
  return fs.readFile(absPath(key));
}

export async function deleteFile(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await fs.unlink(absPath(key));
  } catch {
    /* already gone */
  }
}

export function contentTypeFor(key: string): string {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}
