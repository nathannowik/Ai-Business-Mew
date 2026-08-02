import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth, setPlan, prisma } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("document automation — PDF", () => {
  it("renders a stored document as a valid PDF", async () => {
    const acct = await signup(app);
    await setPlan(acct.organizationId, "pro");

    // Insert a document directly (generation itself needs the AI key).
    const doc = await prisma.document.create({
      data: {
        organizationId: acct.organizationId,
        docType: "quote",
        title: "Quote — Maria",
        customerName: "Maria",
        content: "Line 1: Water heater install $1200\nTotal: $1500",
      },
    });

    const res = await app.inject({ url: `/documents/${doc.id}/pdf`, headers: auth(acct.token) });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.rawPayload.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("gates PDF download behind the plan", async () => {
    const acct = await signup(app); // no plan
    const res = await app.inject({ url: "/documents/whatever/pdf", headers: auth(acct.token) });
    expect(res.statusCode).toBe(402);
  });
});
