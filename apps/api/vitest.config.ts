import { defineConfig } from "vitest/config";

/**
 * Integration tests share one Postgres test database, so we run files serially
 * (fileParallelism: false) and reset tables between tests. The DATABASE_URL
 * here points at a dedicated `mew_test` DB — global-setup.ts creates + migrates
 * it. env vars set here are read before src/env.ts's dotenv (which never
 * overrides already-set vars).
 */
export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    include: ["test/**/*.test.ts"],
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://mew:mew_dev_password@localhost:5432/mew_test?schema=public",
      NODE_ENV: "test",
      JWT_SECRET: "test-jwt-secret-do-not-use-in-prod",
      INTEGRATION_ENCRYPTION_KEY: "test-integration-encryption-key-0123456789",
    },
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 30000,
  },
  // Vite resolves NodeNext-style ".js" import specifiers to their ".ts" source.
  resolve: {
    extensionAlias: { ".js": [".ts", ".js"] },
  },
});
