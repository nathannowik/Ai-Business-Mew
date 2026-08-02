import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth } from "../helpers.js";
import { getKnowledgeContext } from "../../src/modules/receptionist/service.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("knowledge base — internal vs public docs", () => {
  it("keeps internal docs out of the public context but in the internal one", async () => {
    const acct = await signup(app);
    const add = (payload: object) =>
      app.inject({ method: "POST", url: "/knowledge", headers: auth(acct.token), payload });

    await add({ title: "Pricing", content: "Drain cleaning is 120 dollars", internal: false });
    await add({ title: "SOP", content: "Parts markup is thirty five percent", internal: true });

    const publicCtx = await getKnowledgeContext(acct.organizationId);
    expect(publicCtx).toContain("Drain cleaning");
    expect(publicCtx).not.toContain("Parts markup");

    const internalCtx = await getKnowledgeContext(acct.organizationId, { includeInternal: true });
    expect(internalCtx).toContain("Parts markup");
    expect(internalCtx).toContain("Drain cleaning");
  });
});
