/** Centralized, validated environment access. Fails fast on missing critical vars. */
import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Load the monorepo-root .env regardless of the process's cwd (dev via tsx in
// apps/api, or prod from apps/api/dist). Both sit three levels below the root.
loadDotenv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: Number(process.env.API_PORT ?? 4000),
  publicApiUrl: optional("PUBLIC_API_URL", "http://localhost:4000"),
  databaseUrl: required("DATABASE_URL"),

  jwtSecret: optional("JWT_SECRET", "dev-insecure-secret-change-me"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d"),
  integrationEncryptionKey: optional("INTEGRATION_ENCRYPTION_KEY"),

  anthropicApiKey: optional("ANTHROPIC_API_KEY"),
  aiModel: optional("AI_MODEL", "claude-sonnet-5"),
  receptionistModel: optional("RECEPTIONIST_MODEL", "claude-haiku-4-5-20251001"),

  twilio: {
    accountSid: optional("TWILIO_ACCOUNT_SID"),
    authToken: optional("TWILIO_AUTH_TOKEN"),
    phoneNumber: optional("TWILIO_PHONE_NUMBER"),
    /** When Twilio creds are absent we run the receptionist in simulation mode. */
    get enabled() {
      return Boolean(
        process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
      );
    },
  },

  get aiEnabled() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },
} as const;
