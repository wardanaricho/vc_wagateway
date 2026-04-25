import { describe, it, expect } from "vitest";
import { isMatch, findMatchingRule } from "./auto-reply.matcher.js";

describe("isMatch", () => {
  describe("exact", () => {
    it("cocok jika teks sama persis", () => {
      expect(isMatch("halo", "halo", "exact")).toBe(true);
    });

    it("tidak cocok jika berbeda", () => {
      expect(isMatch("halo dunia", "halo", "exact")).toBe(false);
    });

    it("case insensitive", () => {
      expect(isMatch("HALO", "halo", "exact")).toBe(true);
    });
  });

  describe("contains", () => {
    it("cocok jika keyword ada di dalam teks", () => {
      expect(isMatch("halo dunia", "dunia", "contains")).toBe(true);
    });

    it("tidak cocok jika keyword tidak ada", () => {
      expect(isMatch("halo dunia", "pagi", "contains")).toBe(false);
    });
  });

  describe("startsWith", () => {
    it("cocok jika teks diawali keyword", () => {
      expect(isMatch("halo bos", "halo", "startsWith")).toBe(true);
    });

    it("tidak cocok jika tidak diawali keyword", () => {
      expect(isMatch("selamat halo", "halo", "startsWith")).toBe(false);
    });
  });

  describe("endsWith", () => {
    it("cocok jika teks diakhiri keyword", () => {
      expect(isMatch("selamat pagi", "pagi", "endsWith")).toBe(true);
    });

    it("tidak cocok jika tidak diakhiri keyword", () => {
      expect(isMatch("pagi selamat", "pagi", "endsWith")).toBe(false);
    });
  });

  describe("regex", () => {
    it("cocok jika pattern regex match", () => {
      expect(isMatch("order 12345", "order \\d+", "regex")).toBe(true);
    });

    it("tidak cocok jika tidak match", () => {
      expect(isMatch("order abc", "order \\d+", "regex")).toBe(false);
    });

    it("mengembalikan false jika regex invalid", () => {
      expect(isMatch("apapun", "[invalid(", "regex")).toBe(false);
    });
  });
});

describe("findMatchingRule", () => {
  const rules = [
    { keyword: "halo", matchType: "exact", response: "Halo juga!" },
    {
      keyword: "harga",
      matchType: "contains",
      response: "Cek harga di katalog kami",
    },
    {
      keyword: "order",
      matchType: "startsWith",
      response: "Terima kasih sudah order!",
    },
  ];

  it("mengembalikan rule pertama yang cocok", () => {
    const result = findMatchingRule("halo", rules);
    expect(result?.response).toBe("Halo juga!");
  });

  it("mengembalikan rule contains jika cocok", () => {
    const result = findMatchingRule("berapa harga produk?", rules);
    expect(result?.response).toBe("Cek harga di katalog kami");
  });

  it("mengembalikan null jika tidak ada yang cocok", () => {
    const result = findMatchingRule("tidak ada yang cocok", rules);
    expect(result).toBeNull();
  });

  it("mengikuti urutan — rule pertama yang cocok menang", () => {
    const overlappingRules = [
      { keyword: "halo", matchType: "contains", response: "Response 1" },
      { keyword: "halo", matchType: "exact", response: "Response 2" },
    ];
    const result = findMatchingRule("halo", overlappingRules);
    expect(result?.response).toBe("Response 1");
  });
});
