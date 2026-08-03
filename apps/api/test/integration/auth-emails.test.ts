import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup } from "../helpers.js";
import { issueToken } from "../../src/auth/tokens.js";
import { prisma } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("password reset", () => {
  it("forgot-password never reveals whether an email exists", async () => {
    await signup(app, { email: "real@test.dev" });
    for (const email of ["real@test.dev", "nobody@test.dev"]) {
      const res = await app.inject({ method: "POST", url: "/auth/forgot-password", payload: { email } });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
    }
  });

  it("resets the password with a valid token and rejects reuse", async () => {
    const acct = await signup(app, { email: "reset@test.dev" });
    const token = await issueToken(acct.userId, "password_reset");

    const reset = await app.inject({
      method: "POST", url: "/auth/reset-password",
      payload: { token, password: "brand-new-pass" },
    });
    expect(reset.statusCode).toBe(200);

    // New password works, old one doesn't.
    expect((await app.inject({ method: "POST", url: "/auth/login", payload: { email: "reset@test.dev", password: "brand-new-pass" } })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/auth/login", payload: { email: "reset@test.dev", password: "password123" } })).statusCode).toBe(401);

    // Token can't be reused.
    const reuse = await app.inject({
      method: "POST", url: "/auth/reset-password",
      payload: { token, password: "another-pass" },
    });
    expect(reuse.statusCode).toBe(400);
  });

  it("rejects an invalid reset token", async () => {
    const res = await app.inject({
      method: "POST", url: "/auth/reset-password",
      payload: { token: "not-a-real-token", password: "whatever123" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("email verification", () => {
  it("verifies with a valid token", async () => {
    const acct = await signup(app, { email: "verify@test.dev" });
    let user = await prisma.user.findUnique({ where: { id: acct.userId } });
    expect(user!.emailVerified).toBe(false);

    const token = await issueToken(acct.userId, "email_verify");
    const res = await app.inject({ method: "POST", url: "/auth/verify", payload: { token } });
    expect(res.statusCode).toBe(200);

    user = await prisma.user.findUnique({ where: { id: acct.userId } });
    expect(user!.emailVerified).toBe(true);
  });
});
