import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth, setPlan, prisma } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("lead drip re-engagement", () => {
  it("honors opt-out (STOP) without contacting further", async () => {
    const acct = await signup(app);
    await setPlan(acct.organizationId, "pro");

    const res = await app.inject({
      method: "POST",
      url: "/lead-follow-up/simulate",
      headers: auth(acct.token),
      payload: { seed: { name: "Sam", phone: "+15551112222" }, message: "STOP" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().reply.toLowerCase()).toContain("unsubscribed");

    const lead = await prisma.lead.findFirst({ where: { organizationId: acct.organizationId } });
    expect(lead!.optedOut).toBe(true);
  });

  it("does not drip leads that aren't due yet", async () => {
    const acct = await signup(app);
    await setPlan(acct.organizationId, "pro");
    await app.inject({
      method: "POST", url: "/leads", headers: auth(acct.token),
      payload: { name: "Fresh", phone: "+15553334444" },
    });
    const run = await app.inject({ method: "POST", url: "/lead-follow-up/run-drips", headers: auth(acct.token) });
    expect(run.json().sent).toBe(0); // created just now → not due
  });

  it("skips opted-out and booked leads even when overdue", async () => {
    const acct = await signup(app);
    await setPlan(acct.organizationId, "pro");
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await prisma.lead.create({
      data: { organizationId: acct.organizationId, name: "Gone", phone: "+1", messages: [], optedOut: true, lastOutreachAt: old, status: "contacted" },
    });
    await prisma.lead.create({
      data: { organizationId: acct.organizationId, name: "Won", phone: "+2", messages: [], lastOutreachAt: old, status: "booked" },
    });

    const run = await app.inject({ method: "POST", url: "/lead-follow-up/run-drips", headers: auth(acct.token) });
    expect(run.json().sent).toBe(0);
  });
});
