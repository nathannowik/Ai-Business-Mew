import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth, setPlan } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("review management", () => {
  it("gates review actions behind the plan", async () => {
    const acct = await signup(app);
    expect((await app.inject({ url: "/reviews", headers: auth(acct.token) })).statusCode).toBe(402);
  });

  it("adds a review (emitting activity) and syncs cleanly with no source connected", async () => {
    const acct = await signup(app);
    await setPlan(acct.organizationId, "pro");

    const add = await app.inject({
      method: "POST", url: "/reviews", headers: auth(acct.token),
      payload: { author: "Dana", rating: 5, text: "Great work!" },
    });
    expect(add.statusCode).toBe(201);

    const feed = (await app.inject({ url: "/activity", headers: auth(acct.token) })).json();
    expect(feed.some((e: { type: string }) => e.type === "review")).toBe(true);

    // No Google Business integration connected → sync imports nothing, no error.
    const sync = await app.inject({ method: "POST", url: "/reviews/sync", headers: auth(acct.token) });
    expect(sync.statusCode).toBe(200);
    expect(sync.json().imported).toBe(0);
  });
});
