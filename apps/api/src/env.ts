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
  // Hosts (Render/Railway/etc.) inject PORT; fall back to API_PORT then 4000.
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
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

  appBaseUrl: optional("APP_BASE_URL", "http://localhost:3000"),

  email: {
    // Transactional email (verification, password reset, invites). Uses Resend
    // when configured; otherwise emails are logged (simulation) so dev works.
    resendApiKey: optional("RESEND_API_KEY"),
    from: optional("EMAIL_FROM", "Mew AI <onboarding@resend.dev>"),
    get enabled() {
      return Boolean(process.env.RESEND_API_KEY);
    },
  },
  /** When true, users must verify their email before using the dashboard. */
  get requireEmailVerification() {
    return process.env.REQUIRE_EMAIL_VERIFICATION === "1";
  },

  stripe: {
    secretKey: optional("STRIPE_SECRET_KEY"),
    webhookSecret: optional("STRIPE_WEBHOOK_SECRET"),
    get enabled() {
      return Boolean(process.env.STRIPE_SECRET_KEY);
    },
  },

  transcription: {
    // Audio transcription (OpenAI Whisper) — separate from Claude, which has
    // no audio API. Optional; endpoints degrade gracefully when unset.
    openaiApiKey: optional("OPENAI_API_KEY"),
    model: optional("TRANSCRIPTION_MODEL", "whisper-1"),
    get enabled() {
      return Boolean(process.env.OPENAI_API_KEY);
    },
  },

  /** Background scheduler (drip follow-ups, review polling). Off during tests. */
  get schedulerEnabled() {
    return process.env.NODE_ENV !== "test" && process.env.DISABLE_SCHEDULER !== "1";
  },

  get aiEnabled() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },
} as const;
