import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, resetDb, signup, auth, prisma } from "../helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetDb(); });

describe("integrations", () => {
  it("stores secrets encrypted and never returns them", async () => {
    const acct = await signup(app);
    const save = await app.inject({
      method: "PUT",
      url: "/integrations/twilio",
      headers: auth(acct.token),
      payload: {
        config: { accountSid: "ACxxx", authToken: "super_secret_token", phoneNumber: "+15550001111" },
      },
    });
    expect(save.statusCode).toBe(200);
    expect(save.json().connected).toBe(true);

    // The list response must not leak the secret.
    const list = (await app.inject({ url: "/integrations", headers: auth(acct.token) })).body;
    expect(list).not.toContain("super_secret_token");
    expect(list).toContain("+15550001111"); // non-secret field is echoed

    // The stored value in the DB must be ciphertext, not plaintext.
    const row = await prisma.integration.findFirst({
      where: { organizationId: acct.organizationId, provider: "twilio" },
    });
    const stored = (row!.config as Record<string, string>).authToken;
    expect(stored).not.toContain("super_secret_token");
    expect(stored.startsWith("v1:")).toBe(true);
  });

  it("keeps an existing secret when re-saved blank", async () => {
    const acct = await signup(app);
    const put = (payload: Record<string, string>) =>
      app.inject({ method: "PUT", url: "/integrations/twilio", headers: auth(acct.token), payload: { config: payload } });

    await put({ accountSid: "AC1", authToken: "secret1", phoneNumber: "+1" });
    await put({ accountSid: "AC2", authToken: "", phoneNumber: "+2" }); // blank secret

    const row = await prisma.integration.findFirst({
      where: { organizationId: acct.organizationId, provider: "twilio" },
    });
    const cfg = row!.config as Record<string, string>;
    expect(cfg.accountSid).toBe("AC2"); // non-secret updated
    expect(cfg.authToken).not.toBe(""); // secret preserved
  });
});
