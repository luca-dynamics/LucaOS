import { describe, expect, it } from "vitest";
import { createHash, createHmac } from "./node_polyfills.js";

// The browser-safe crypto polyfill previously returned the constants
// 'mock-hash' / 'mock-hmac', making any web-bundle integrity check forgeable.
// These assert the digests are now real and input-dependent.
describe("node_polyfills crypto (browser-safe)", () => {
  it("computes a correct, known MD5 digest", () => {
    expect(createHash("md5").update("hello").digest("hex")).toBe(
      "5d41402abc4b2a76b9719d911017c592",
    );
  });

  it("computes a correct, known SHA-256 digest", () => {
    expect(createHash("sha256").update("abc").digest("hex")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is input-dependent, not a constant (the core fix)", () => {
    const a = createHash("md5").update("a").digest("hex");
    const b = createHash("md5").update("b").digest("hex");
    expect(a).not.toBe(b);
    expect(a).not.toBe("mock-hash");
  });

  it("hashes binary Buffer/Uint8Array input", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const digest = createHash("md5").update(bytes).digest("hex");
    expect(digest).toMatch(/^[0-9a-f]{32}$/);
    expect(digest).not.toBe("mock-hash");
  });

  it("produces a real, key-dependent HMAC", () => {
    const withKey1 = createHmac("sha256", "k1").update("msg").digest("hex");
    const withKey2 = createHmac("sha256", "k2").update("msg").digest("hex");
    expect(withKey1).not.toBe(withKey2); // key actually matters
    expect(withKey1).not.toBe("mock-hmac");
    expect(withKey1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws on an unsupported algorithm rather than silently faking one", () => {
    expect(() => createHash("nonsense")).toThrow();
    expect(() => createHmac("nonsense", "k")).toThrow();
  });
});
