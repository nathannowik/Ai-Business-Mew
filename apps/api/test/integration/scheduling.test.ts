import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth, setPlan } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

async function createAppointment(token: string) {
  const res = await app.inject({
    method: "POST",
    url: "/appointments",
    headers: auth(token),
    payload: {
      customerName: "Maria",
      customerPhone: "+15551234567",
      startsAt: "2026-08-10T15:00:00.000Z",
    },
  });
  return res.json().id as string;
}

describe("scheduling", () => {
  it("gates confirm/remind behind the scheduling plan", async () => {
    const acct = await signup(app); // no plan
    const id = await createAppointment(acct.token);
    const res = await app.inject({ method: "POST", url: `/appointments/${id}/confirm`, headers: auth(acct.token) });
    expect(res.statusCode).toBe(402);
  });

  it("confirms, reschedules, and cancels with an active plan", async () => {
    const acct = await signup(app);
    await setPlan(acct.organizationId, "pro");
    const id = await createAppointment(acct.token);

    const confirm = await app.inject({ method: "POST", url: `/appointments/${id}/confirm`, headers: auth(acct.token) });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().message).toContain("Maria");
    expect(confirm.json().simulated).toBe(true); // no Twilio configured

    const newTime = "2026-08-12T18:00:00.000Z";
    const patch = await app.inject({
      method: "PATCH", url: `/appointments/${id}`, headers: auth(acct.token),
      payload: { startsAt: newTime },
    });
    expect(new Date(patch.json().startsAt).toISOString()).toBe(newTime);

    const cancel = await app.inject({ method: "POST", url: `/appointments/${id}/cancel`, headers: auth(acct.token) });
    expect(cancel.statusCode).toBe(200);
    const list = await app.inject({ url: "/appointments", headers: auth(acct.token) });
    expect(list.json()).toHaveLength(0);
  });
});
