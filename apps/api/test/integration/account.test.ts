import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth, prisma } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("account export + deletion", () => {
  it("exports data without secrets or password hashes", async () => {
    const acct = await signup(app, { email: "owner@acct.dev" });
    await app.inject({
      method: "POST", url: "/leads", headers: auth(acct.token),
      payload: { name: "Exported Lead", phone: "+1" },
    });
    await app.inject({
      method: "PUT", url: "/integrations/twilio", headers: auth(acct.token),
      payload: { config: { accountSid: "AC1", authToken: "top_secret_xyz", phoneNumber: "+1" } },
    });

    const res = await app.inject({ url: "/account/export", headers: auth(acct.token) });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body).toContain("Exported Lead");
    expect(res.body).not.toContain("top_secret_xyz"); // integrations excluded
    expect(res.body).not.toContain("passwordHash");
  });

  it("only the owner can delete, and deletion removes the org", async () => {
    const owner = await signup(app, { email: "o@acct.dev" });
    await app.inject({
      method: "POST", url: "/team", headers: auth(owner.token),
      payload: { name: "Member", email: "m@acct.dev", role: "member", password: "password123" },
    });
    const memberToken = (await app.inject({
      method: "POST", url: "/auth/login", payload: { email: "m@acct.dev", password: "password123" },
    })).json().token;

    // Member is blocked.
    expect((await app.inject({ method: "DELETE", url: "/account", headers: auth(memberToken) })).statusCode).toBe(403);

    // Owner deletes → org and users gone.
    expect((await app.inject({ method: "DELETE", url: "/account", headers: auth(owner.token) })).statusCode).toBe(204);
    expect(await prisma.organization.findUnique({ where: { id: owner.organizationId } })).toBeNull();
    expect((await app.inject({ method: "POST", url: "/auth/login", payload: { email: "o@acct.dev", password: "password123" } })).statusCode).toBe(401);
  });
});
