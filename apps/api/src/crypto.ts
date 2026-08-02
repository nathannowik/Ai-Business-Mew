import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { env } from "./env.js";

/**
 * AES-256-GCM encryption for integration secrets stored in the DB.
 *
 * The key is derived from INTEGRATION_ENCRYPTION_KEY if set, otherwise from
 * JWT_SECRET so local dev works out of the box. For production, set a dedicated
 * INTEGRATION_ENCRYPTION_KEY (see .env.example) so rotating auth doesn't
 * invalidate stored secrets.
 */
const KEY = scryptSync(
  env.integrationEncryptionKey || env.jwtSecret,
  "mew-integration-secrets",
  32,
);

const FORMAT = "v1"; // prefix so we can evolve the scheme later

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [FORMAT, iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [format, ivB64, tagB64, dataB64] = payload.split(":");
  if (format !== FORMAT) throw new Error("Unknown secret format");
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
