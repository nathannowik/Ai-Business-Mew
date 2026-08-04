import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

// Node crypto scrypt — only imported by server code (never middleware).
const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

/** Hash a password as "salt:derivedKey" (both hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

/** Verify a password against a stored "salt:hash" string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, 'hex');
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(keyBuf, derived);
}
