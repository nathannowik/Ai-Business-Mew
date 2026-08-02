import { execSync } from "node:child_process";

/**
 * Provision the test database once before the suite runs: create it if missing,
 * then apply migrations. Requires a reachable Postgres (locally: the dev
 * instance; in CI: a Postgres service). Set TEST_DATABASE_URL to override.
 */
const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://mew:mew_dev_password@localhost:5432/mew_test?schema=public";

export default function setup(): void {
  const parsed = new URL(TEST_DB_URL);
  const dbName = parsed.pathname.replace(/^\//, "");

  // Create the database (ignore "already exists").
  try {
    execSync(`createdb -h ${parsed.hostname} -p ${parsed.port || 5432} -U ${parsed.username} ${dbName}`, {
      env: { ...process.env, PGPASSWORD: parsed.password },
      stdio: "ignore",
    });
  } catch {
    // already exists — fine
  }

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  });
}
