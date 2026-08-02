import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("CSV export + dashboard summary", () => {
  it("exports leads as CSV", async () => {
    const acct = await signup(app);
    await app.inject({
      method: "POST", url: "/leads", headers: auth(acct.token),
      payload: { name: "Jamie, Jr.", phone: "+15551110000", inquiry: 'wants a "quote"' },
    });
    const res = await app.inject({ url: "/leads/export.csv", headers: auth(acct.token) });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.body).toContain("Name,Phone,Email");
    // Commas/quotes in fields are escaped.
    expect(res.body).toContain('"Jamie, Jr."');
    expect(res.body).toContain('"wants a ""quote"""');
  });

  it("returns a dashboard summary", async () => {
    const acct = await signup(app);
    await app.inject({
      method: "POST", url: "/leads", headers: auth(acct.token),
      payload: { name: "Lead One", phone: "+1" },
    });
    const res = await app.inject({ url: "/dashboard-summary", headers: auth(acct.token) });
    expect(res.statusCode).toBe(200);
    expect(res.json().metrics.leads).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.json().recentActivity)).toBe(true);
  });
});
