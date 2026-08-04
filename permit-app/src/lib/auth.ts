// Per-user session auth. The cookie holds "userId.signature", where signature is an
// HMAC of the userId keyed by AUTH_SECRET — so it can't be forged without the secret.
// Uses Web Crypto only, so verification also runs in edge middleware.

export const COOKIE_NAME = 'pp_session';

function authSecret(): string {
  return process.env.AUTH_SECRET || 'insecure-dev-secret-change-me';
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(authSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toHex(sig);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Build the signed cookie value for a user id. */
export async function makeSession(userId: string): Promise<string> {
  return `${userId}.${await sign(userId)}`;
}

/** Return the userId if the cookie value is a valid, untampered session; else null. */
export async function readSession(value: string | undefined | null): Promise<string | null> {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const userId = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await sign(userId);
  return safeEqual(sig, expected) ? userId : null;
}

// Role helpers (string-based so they work anywhere).
export type Role = 'admin' | 'manager' | 'member';
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
};
export function isAdmin(role: string | undefined): boolean {
  return role === 'admin';
}
