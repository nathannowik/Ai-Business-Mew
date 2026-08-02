import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "../../src/crypto.js";

describe("secret encryption", () => {
  it("round-trips a value", () => {
    const plain = "AC_super_secret_token_123";
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain); // ciphertext must not leak plaintext
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("produces different ciphertext each time (random IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("rejects tampered ciphertext", () => {
    const enc = encryptSecret("value");
    const parts = enc.split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });
});
