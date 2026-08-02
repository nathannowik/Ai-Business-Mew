import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, setPlan } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("public self-service booking", () => {
  it("blocks booking for orgs without the scheduling plan", async () => {
    const acct = await signup(app);
    const res = await app.inject({ url: `/public/booking/${acct.organizationId}/slots` });
    expect(res.statusCode).toBe(403);
  });

  it("offers slots and prevents double-booking", async () => {
    const acct = await signup(app);
    await setPlan(acct.organizationId, "pro");

    const slotsRes = await app.inject({ url: `/public/booking/${acct.organizationId}/slots` });
    expect(slotsRes.statusCode).toBe(200);
    const slots = slotsRes.json().slots;
    expect(slots.length).toBeGreaterThan(0);

    const startsAt = slots[0].startISO;
    const first = await app.inject({
      method: "POST", url: `/public/booking/${acct.organizationId}`,
      payload: { name: "Walk-in", phone: "+15551230000", startsAt },
    });
    expect(first.statusCode).toBe(201);

    // Booking the same slot again is rejected.
    const second = await app.inject({
      method: "POST", url: `/public/booking/${acct.organizationId}`,
      payload: { name: "Someone else", startsAt },
    });
    expect(second.statusCode).toBe(409);

    // That slot no longer appears in availability.
    const after = (await app.inject({ url: `/public/booking/${acct.organizationId}/slots` })).json();
    expect(after.slots.some((s: { startISO: string }) => s.startISO === startsAt)).toBe(false);
  });
});
