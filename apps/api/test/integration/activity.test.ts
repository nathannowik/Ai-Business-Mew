import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("activity feed", () => {
  it("records events and tracks unread → read", async () => {
    const acct = await signup(app);

    // Creating a lead emits an activity event.
    await app.inject({
      method: "POST", url: "/leads", headers: auth(acct.token),
      payload: { name: "Pat", phone: "+15550000000", inquiry: "quote please" },
    });

    const feed = (await app.inject({ url: "/activity", headers: auth(acct.token) })).json();
    expect(feed.length).toBe(1);
    expect(feed[0].type).toBe("lead");
    expect(feed[0].title).toContain("Pat");

    const before = (await app.inject({ url: "/activity/unread-count", headers: auth(acct.token) })).json();
    expect(before.count).toBe(1);

    await app.inject({ method: "POST", url: "/activity/read", headers: auth(acct.token) });
    const after = (await app.inject({ url: "/activity/unread-count", headers: auth(acct.token) })).json();
    expect(after.count).toBe(0);
  });

  it("scopes activity per tenant", async () => {
    const a = await signup(app, { email: "a-act@test.dev" });
    const b = await signup(app, { email: "b-act@test.dev" });
    await app.inject({
      method: "POST", url: "/leads", headers: auth(a.token),
      payload: { name: "A lead", phone: "+1" },
    });
    const bFeed = (await app.inject({ url: "/activity", headers: auth(b.token) })).json();
    expect(bFeed).toHaveLength(0);
  });
});
