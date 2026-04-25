import { describe, it, expect } from "vitest";
import { randomDelay, withJitter, toWhatsAppJid } from "./anti-ban.utils.js";

describe("randomDelay", () => {
  it("resolve setelah delay", async () => {
    const start = Date.now();
    await randomDelay(10, 50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(10);
  });

  it("delay tidak melebihi maxMs + toleransi", async () => {
    const start = Date.now();
    await randomDelay(10, 100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(200); // toleransi 100ms
  });
});

describe("withJitter", () => {
  it("menghasilkan nilai dalam range jitter", () => {
    const base = 1000;
    const jitterPercent = 0.2;
    const result = withJitter(base, jitterPercent);
    expect(result).toBeGreaterThanOrEqual(800); // 1000 - 20%
    expect(result).toBeLessThanOrEqual(1200); // 1000 + 20%
  });

  it("default jitter 20%", () => {
    const base = 1000;
    const result = withJitter(base);
    expect(result).toBeGreaterThanOrEqual(800);
    expect(result).toBeLessThanOrEqual(1200);
  });
});

describe("toWhatsAppJid", () => {
  it("konversi 08xxx ke 628xxx@s.whatsapp.net", () => {
    expect(toWhatsAppJid("08123456789")).toBe("628123456789@s.whatsapp.net");
  });

  it("konversi +628xxx ke 628xxx@s.whatsapp.net", () => {
    expect(toWhatsAppJid("+628123456789")).toBe("628123456789@s.whatsapp.net");
  });

  it("628xxx tetap 628xxx@s.whatsapp.net", () => {
    expect(toWhatsAppJid("628123456789")).toBe("628123456789@s.whatsapp.net");
  });

  it("hapus karakter non-digit", () => {
    expect(toWhatsAppJid("+62 812-3456-789")).toBe(
      "628123456789@s.whatsapp.net",
    );
  });
});
