import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth, setPlan } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("sales assistant — opportunity pipeline", () => {
  it("gates the pipeline behind the plan", async () => {
    const acct = await signup(app);
    const res = await app.inject({ url: "/sales/opportunities", headers: auth(acct.token) });
    expect(res.statusCode).toBe(402);
  });

  it("creates, advances, and lists opportunities", async () => {
    const acct = await signup(app);
    await setPlan(acct.organizationId, "pro");

    const created = await app.inject({
      method: "POST", url: "/sales/opportunities", headers: auth(acct.token),
      payload: { name: "Acme Corp", value: 5000 },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    expect(created.json().stage).toBe("new");

    const patched = await app.inject({
      method: "PATCH", url: `/sales/opportunities/${id}`, headers: auth(acct.token),
      payload: { stage: "won" },
    });
    expect(patched.json().stage).toBe("won");

    const list = await app.inject({ url: "/sales/opportunities", headers: auth(acct.token) });
    expect(list.json()).toHaveLength(1);
  });
});
