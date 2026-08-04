// Lightweight single-tenant auth. A shared password (APP_PASSWORD) unlocks the app; the
// session cookie stores an HMAC token derived from AUTH_SECRET, so it can't be forged
// without the secret. Uses Web Crypto only, so the same code runs in edge middleware.

export const COOKIE_NAME = 'pp_auth';
const SESSION_PAYLOAD = 'permitpilot-session-v1';

export function appPassword(): string {
  return process.env.APP_PASSWORD || 'permitpilot';
}

function authSecret(): string {
  // A default keeps local dev frictionless; production should set AUTH_SECRET.
  return process.env.AUTH_SECRET || `insecure-dev-secret::${appPassword()}`;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Deterministic, unguessable session token derived from the secret. */
export async function sessionToken(): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(authSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(SESSION_PAYLOAD));
  return toHex(sig);
}

/** Constant-time-ish check that a cookie value matches the expected session token. */
export async function isValidToken(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const expected = await sessionToken();
  if (value.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
