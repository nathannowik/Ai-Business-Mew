import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("auth", () => {
  it("signup creates an org + returns a usable token", async () => {
    const acct = await signup(app);
    const me = await app.inject({ url: "/me", headers: auth(acct.token) });
    expect(me.statusCode).toBe(200);
    expect(me.json().organizationId).toBe(acct.organizationId);
  });

  it("login works and rejects bad credentials", async () => {
    const acct = await signup(app, { email: "login@test.dev" });
    const ok = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: acct.email, password: "password123" },
    });
    expect(ok.statusCode).toBe(200);

    const bad = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: acct.email, password: "wrong" },
    });
    expect(bad.statusCode).toBe(401);
  });

  it("rejects duplicate email signup", async () => {
    await signup(app, { email: "dup@test.dev" });
    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "dup@test.dev", password: "password123", name: "X", organizationName: "Y" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("protected routes require a valid token", async () => {
    expect((await app.inject({ url: "/me" })).statusCode).toBe(401);
    expect((await app.inject({ url: "/me", headers: auth("bogus") })).statusCode).toBe(401);
  });

  it("tenants are isolated — one org cannot see another's data", async () => {
    const a = await signup(app, { email: "a@test.dev" });
    const b = await signup(app, { email: "b@test.dev" });
    // a's knowledge doc
    await app.inject({
      method: "POST",
      url: "/knowledge",
      headers: auth(a.token),
      payload: { title: "Secret", content: "A only" },
    });
    const bDocs = await app.inject({ url: "/knowledge", headers: auth(b.token) });
    expect(bDocs.json()).toHaveLength(0);
  });
});
