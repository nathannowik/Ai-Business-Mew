import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth, setPlan } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("onboarding status", () => {
  it("starts incomplete and reflects progress", async () => {
    const acct = await signup(app);

    const before = (await app.inject({ url: "/onboarding-status", headers: auth(acct.token) })).json();
    expect(before.complete).toBe(false);
    expect(before.steps.find((s: { key: string }) => s.key === "plan").done).toBe(false);

    // Choosing a plan flips that step.
    await setPlan(acct.organizationId, "pro");
    const after = (await app.inject({ url: "/onboarding-status", headers: auth(acct.token) })).json();
    expect(after.steps.find((s: { key: string }) => s.key === "plan").done).toBe(true);
    expect(after.completed).toBeGreaterThan(before.completed);
  });
});
