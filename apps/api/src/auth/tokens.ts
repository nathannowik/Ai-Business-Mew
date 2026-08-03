import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../db.js";

export type AuthTokenType = "email_verify" | "password_reset";

const TTL_MS: Record<AuthTokenType, number> = {
  email_verify: 7 * 24 * 60 * 60 * 1000, // 7 days
  password_reset: 60 * 60 * 1000, // 1 hour
};

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a token row and return the RAW token (to email). Only the hash is stored. */
export async function issueToken(userId: string, type: AuthTokenType): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  await prisma.authToken.create({
    data: {
      type,
      tokenHash: hash(raw),
      userId,
      expiresAt: new Date(Date.now() + TTL_MS[type]),
    },
  });
  return raw;
}

/** Validate + consume a token. Returns the userId, or null if invalid/expired/used. */
export async function consumeToken(
  raw: string,
  type: AuthTokenType,
): Promise<string | null> {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hash(raw) } });
  if (!row || row.type !== type || row.consumedAt || row.expiresAt < new Date()) {
    return null;
  }
  await prisma.authToken.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return row.userId;
}
