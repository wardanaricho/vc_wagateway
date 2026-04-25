import { describe, it, expect } from "vitest";
import { createSignature, verifySignature } from "./webhook.signature.js";

describe("createSignature", () => {
  it("menghasilkan string dengan prefix sha256=", () => {
    const sig = createSignature("secret123", "payload");
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("payload sama + secret sama = signature sama", () => {
    const sig1 = createSignature("secret", "data");
    const sig2 = createSignature("secret", "data");
    expect(sig1).toBe(sig2);
  });

  it("payload berbeda = signature berbeda", () => {
    const sig1 = createSignature("secret", "data1");
    const sig2 = createSignature("secret", "data2");
    expect(sig1).not.toBe(sig2);
  });

  it("secret berbeda = signature berbeda", () => {
    const sig1 = createSignature("secret1", "data");
    const sig2 = createSignature("secret2", "data");
    expect(sig1).not.toBe(sig2);
  });
});

describe("verifySignature", () => {
  it("mengembalikan true jika signature valid", () => {
    const payload = JSON.stringify({ event: "message.received" });
    const sig = createSignature("mysecret", payload);
    expect(verifySignature("mysecret", payload, sig)).toBe(true);
  });

  it("mengembalikan false jika signature salah", () => {
    const payload = JSON.stringify({ event: "message.received" });
    expect(verifySignature("mysecret", payload, "sha256=salah")).toBe(false);
  });

  it("mengembalikan false jika secret berbeda", () => {
    const payload = "test";
    const sig = createSignature("secret1", payload);
    expect(verifySignature("secret2", payload, sig)).toBe(false);
  });

  it("mengembalikan false jika payload diubah", () => {
    const sig = createSignature("secret", "payload asli");
    expect(verifySignature("secret", "payload diubah", sig)).toBe(false);
  });
});
