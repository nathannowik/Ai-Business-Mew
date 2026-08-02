import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("team management", () => {
  it("owner invites a member; members can't invite; owner is protected", async () => {
    const owner = await signup(app, { email: "owner@team.dev" });

    const list0 = (await app.inject({ url: "/team", headers: auth(owner.token) })).json();
    expect(list0).toHaveLength(1);
    expect(list0[0].role).toBe("owner");

    // Owner invites a member.
    const invite = await app.inject({
      method: "POST", url: "/team", headers: auth(owner.token),
      payload: { email: "member@team.dev", name: "Member", role: "member", password: "password123" },
    });
    expect(invite.statusCode).toBe(201);

    const list1 = (await app.inject({ url: "/team", headers: auth(owner.token) })).json();
    expect(list1).toHaveLength(2);

    // The member logs in and cannot invite others.
    const login = await app.inject({
      method: "POST", url: "/auth/login",
      payload: { email: "member@team.dev", password: "password123" },
    });
    const memberToken = login.json().token;
    const denied = await app.inject({
      method: "POST", url: "/team", headers: auth(memberToken),
      payload: { email: "x@team.dev", name: "X", role: "member", password: "password123" },
    });
    expect(denied.statusCode).toBe(403);

    // Owner can't be removed and can't remove self.
    const ownerId = list1.find((u: { role: string }) => u.role === "owner").id;
    const rmOwner = await app.inject({ method: "DELETE", url: `/team/${ownerId}`, headers: auth(owner.token) });
    expect([400]).toContain(rmOwner.statusCode);
  });
});
