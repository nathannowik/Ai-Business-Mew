import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../../src/auth/jwt.js";
import { hashPassword, verifyPassword } from "../../src/auth/password.js";

describe("jwt", () => {
  it("signs and verifies a payload", () => {
    const token = signToken({ userId: "u1", organizationId: "o1", role: "owner" });
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe("u1");
    expect(decoded.organizationId).toBe("o1");
  });

  it("rejects a garbage token", () => {
    expect(() => verifyToken("not.a.token")).toThrow();
  });
});

describe("password hashing", () => {
  it("verifies the correct password and rejects wrong ones", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toBe("hunter2");
    expect(await verifyPassword("hunter2", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
