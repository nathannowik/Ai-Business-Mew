import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth, makePlatformAdmin } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("agency console (admin)", () => {
  it("blocks non-admins", async () => {
    const acct = await signup(app);
    const res = await app.inject({ url: "/admin/organizations", headers: auth(acct.token) });
    expect(res.statusCode).toBe(403);
  });

  it("lets a platform admin list orgs and impersonate", async () => {
    const admin = await signup(app, { email: "admin@test.dev", organizationName: "HQ" });
    const client = await signup(app, { email: "client@test.dev", organizationName: "Client Co" });
    await makePlatformAdmin(admin.userId);

    const list = await app.inject({ url: "/admin/organizations", headers: auth(admin.token) });
    expect(list.statusCode).toBe(200);
    expect(list.json().length).toBe(2);

    // Impersonate the client org.
    const imp = await app.inject({
      method: "POST",
      url: `/admin/organizations/${client.organizationId}/impersonate`,
      headers: auth(admin.token),
    });
    expect(imp.statusCode).toBe(200);
    const impToken = imp.json().token;

    const me = await app.inject({ url: "/me", headers: auth(impToken) });
    expect(me.json().organizationId).toBe(client.organizationId);
    expect(me.json().impersonating).toBe(true);
  });
});
