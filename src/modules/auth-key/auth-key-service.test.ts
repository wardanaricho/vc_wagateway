import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    authKey: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../../lib/prisma.js";
import {
  getAuthKey,
  getAllAuthKeys,
  setAuthKey,
  setManyAuthKeys,
  deleteAuthKeys,
} from "./auth-key.service.js";

const findUnique = prisma.authKey.findUnique as unknown as ReturnType<
  typeof vi.fn
>;
const findMany = prisma.authKey.findMany as unknown as ReturnType<typeof vi.fn>;
const upsert = prisma.authKey.upsert as unknown as ReturnType<typeof vi.fn>;
const deleteMany = prisma.authKey.deleteMany as unknown as ReturnType<
  typeof vi.fn
>;
const transaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe("getAuthKey", () => {
  it("mengembalikan data yang sudah di-parse", async () => {
    findUnique.mockResolvedValue({ data: JSON.stringify({ key: "value" }) });

    const result = await getAuthKey("session-123", "key-abc");

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sessionId_keyId: { sessionId: "session-123", keyId: "key-abc" },
        },
      }),
    );
    expect(result).toEqual({ key: "value" });
  });

  it("mengembalikan null jika tidak ditemukan", async () => {
    findUnique.mockResolvedValue(null);

    const result = await getAuthKey("session-123", "tidak-ada");

    expect(result).toBeNull();
  });

  it("mengembalikan null jika data JSON rusak", async () => {
    findUnique.mockResolvedValue({ data: "bukan-json{{" });

    const result = await getAuthKey("session-123", "key-abc");

    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getAllAuthKeys", () => {
  it("mengembalikan semua keys sebagai object", async () => {
    findMany.mockResolvedValue([
      { keyId: "key-1", data: JSON.stringify({ val: 1 }) },
      { keyId: "key-2", data: JSON.stringify({ val: 2 }) },
    ]);

    const result = await getAllAuthKeys("session-123");

    expect(result).toEqual({
      "key-1": { val: 1 },
      "key-2": { val: 2 },
    });
  });

  it("mengembalikan object kosong jika tidak ada keys", async () => {
    findMany.mockResolvedValue([]);

    const result = await getAllAuthKeys("session-123");

    expect(result).toEqual({});
  });

  it("set null untuk key dengan JSON rusak", async () => {
    findMany.mockResolvedValue([{ keyId: "key-rusak", data: "{{rusak" }]);

    const result = await getAllAuthKeys("session-123");

    expect(result).toEqual({ "key-rusak": null });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("setAuthKey", () => {
  it("memanggil upsert dengan data yang di-stringify", async () => {
    upsert.mockResolvedValue({});

    await setAuthKey("session-123", "key-abc", { creds: "data" });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sessionId_keyId: { sessionId: "session-123", keyId: "key-abc" },
        },
        create: expect.objectContaining({
          data: JSON.stringify({ creds: "data" }),
        }),
        update: expect.objectContaining({
          data: JSON.stringify({ creds: "data" }),
        }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("setManyAuthKeys", () => {
  it("memanggil transaction dengan upsert untuk setiap key", async () => {
    upsert.mockResolvedValue({});
    transaction.mockResolvedValue([]);

    await setManyAuthKeys("session-123", {
      "key-1": { a: 1 },
      "key-2": { b: 2 },
    });

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenCalledOnce();
  });

  it("tidak memanggil transaction jika keys kosong", async () => {
    transaction.mockResolvedValue([]);

    await setManyAuthKeys("session-123", {});

    expect(transaction).toHaveBeenCalledWith([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteAuthKeys", () => {
  it("menghapus semua keys milik session", async () => {
    deleteMany.mockResolvedValue({ count: 3 });

    await deleteAuthKeys("session-123");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { sessionId: "session-123" },
    });
  });
});
