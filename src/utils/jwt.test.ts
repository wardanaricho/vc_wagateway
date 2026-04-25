import { describe, it, expect, vi } from "vitest";

vi.stubEnv(
  "JWT_ACCESS_SECRET",
  "test_access_secret_panjang_minimal_64_karakter_supaya_aman_ya",
);
vi.stubEnv(
  "JWT_REFRESH_SECRET",
  "test_refresh_secret_panjang_minimal_64_karakter_supaya_aman_ya",
);

const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = await import("./jwt.js");

const payload = { sub: "user-123", email: "test@test.com", role: "user" };

describe("JWT Utils", () => {
  describe("signAccessToken & verifyAccessToken", () => {
    it("harus menghasilkan token yang valid", () => {
      const token = signAccessToken(payload);
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("harus bisa di-decode kembali", () => {
      const token = signAccessToken(payload);
      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it("harus throw jika token tidak valid", () => {
      expect(() => verifyAccessToken("token.palsu.banget")).toThrow();
    });

    it("harus throw jika pakai secret yang salah", () => {
      const token = signRefreshToken(payload);
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe("signRefreshToken & verifyRefreshToken", () => {
    it("harus menghasilkan token yang valid", () => {
      const token = signRefreshToken(payload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
    });

    it("harus throw jika token tidak valid", () => {
      expect(() => verifyRefreshToken("invalid.token.here")).toThrow();
    });
  });
});
