import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

function entitledMap(services: Array<{ key: string; entitled: boolean }>) {
  return Object.fromEntries(services.map((s) => [s.key, s.entitled]));
}

describe("billing + entitlements", () => {
  it("a new org has no plan and no entitlements", async () => {
    const acct = await signup(app);
    const services = (await app.inject({ url: "/services", headers: auth(acct.token) })).json();
    const map = entitledMap(services);
    expect(map.receptionist).toBe(false);
    // gated action is blocked
    const sim = await app.inject({
      method: "POST",
      url: "/receptionist/simulate",
      headers: auth(acct.token),
      payload: { message: "hi" },
    });
    expect(sim.statusCode).toBe(402);
  });

  it("subscribing (simulation) unlocks the plan's services only", async () => {
    const acct = await signup(app);
    const checkout = await app.inject({
      method: "POST",
      url: "/billing/checkout",
      headers: auth(acct.token),
      payload: { planKey: "starter" },
    });
    expect(checkout.statusCode).toBe(200);
    expect(checkout.json().simulated).toBe(true);

    const services = (await app.inject({ url: "/services", headers: auth(acct.token) })).json();
    const map = entitledMap(services);
    expect(map.receptionist).toBe(true); // starter includes receptionist
    expect(map.lead_follow_up).toBe(false); // but not lead follow-up

    // lead follow-up action is still gated
    const sim = await app.inject({
      method: "POST",
      url: "/lead-follow-up/simulate",
      headers: auth(acct.token),
      payload: { seed: { name: "x", phone: "+1", inquiry: "y" } },
    });
    expect(sim.statusCode).toBe(402);
  });

  it("cancel revokes access", async () => {
    const acct = await signup(app);
    await app.inject({
      method: "POST", url: "/billing/checkout", headers: auth(acct.token),
      payload: { planKey: "pro" },
    });
    await app.inject({ method: "POST", url: "/billing/cancel", headers: auth(acct.token) });
    const services = (await app.inject({ url: "/services", headers: auth(acct.token) })).json();
    expect(entitledMap(services).receptionist).toBe(false);
  });
});
