import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    apiKey: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "../../../lib/prisma.js";

import {
  createApiKey,
  getApiKeysByUser,
  revokeApiKey,
  deleteApiKey,
  validateApiKey,
} from "./api-key.service.js";

const create = prisma.apiKey.create as unknown as ReturnType<typeof vi.fn>;
const findMany = prisma.apiKey.findMany as unknown as ReturnType<typeof vi.fn>;
const findFirst = prisma.apiKey.findFirst as unknown as ReturnType<
  typeof vi.fn
>;
const findUnique = prisma.apiKey.findUnique as unknown as ReturnType<
  typeof vi.fn
>;
const update = prisma.apiKey.update as unknown as ReturnType<typeof vi.fn>;
const del = prisma.apiKey.delete as unknown as ReturnType<typeof vi.fn>;

const mockKey = {
  id: "key-123",
  userId: "user-123",
  name: "Key Production",
  key: "rwp_abc123def456",
  isActive: true,
  createdAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe("createApiKey", () => {
  it("berhasil membuat API key dengan prefix rwp_", async () => {
    create.mockResolvedValue(mockKey);

    const result = (await createApiKey("user-123", {
      name: "Key Production",
    })) as typeof mockKey;

    expect(create).toHaveBeenCalledOnce();

    // pastikan key yang di-generate punya format yang benar
    const calledData = create.mock.calls[0]?.[0]?.data as {
      key: string;
      name: string;
      userId: string;
    };
    expect(calledData).toBeDefined();
    expect(calledData.key).toMatch(/^rwp_[a-f0-9]{32}$/);
    expect(calledData.name).toBe("Key Production");
    expect(calledData.userId).toBe("user-123");
    expect(result.name).toBe("Key Production");
  });

  it("setiap generate menghasilkan key yang unik", async () => {
    create.mockResolvedValue(mockKey);

    await createApiKey("user-123", { name: "Key 1" });
    await createApiKey("user-123", { name: "Key 2" });

    const key1 = create.mock.calls[0]?.[0]?.data.key as string;
    const key2 = create.mock.calls[1]?.[0]?.data.key as string;

    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).not.toBe(key2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getApiKeysByUser", () => {
  it("mengembalikan list API keys milik user", async () => {
    findMany.mockResolvedValue([mockKey]);

    const result = await getApiKeysByUser("user-123");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-123" } }),
    );
    expect(result).toHaveLength(1);
  });

  it("mengembalikan array kosong jika tidak ada keys", async () => {
    findMany.mockResolvedValue([]);

    const result = await getApiKeysByUser("user-123");

    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("revokeApiKey", () => {
  it("berhasil merevoke API key", async () => {
    findFirst.mockResolvedValue(mockKey);
    update.mockResolvedValue({ ...mockKey, isActive: false });

    const result = await revokeApiKey("key-123", "user-123");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key-123" },
        data: { isActive: false },
      }),
    );
    expect(result.isActive).toBe(false);
  });

  it("throw jika key tidak ditemukan", async () => {
    findFirst.mockResolvedValue(null);

    await expect(revokeApiKey("key-tidak-ada", "user-123")).rejects.toThrow(
      "API key tidak ditemukan",
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("throw jika key milik user lain", async () => {
    findFirst.mockResolvedValue(null);

    await expect(revokeApiKey("key-123", "user-lain")).rejects.toThrow(
      "API key tidak ditemukan",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteApiKey", () => {
  it("berhasil menghapus API key", async () => {
    findFirst.mockResolvedValue(mockKey);
    del.mockResolvedValue(mockKey);

    await deleteApiKey("key-123", "user-123");

    expect(del).toHaveBeenCalledWith({ where: { id: "key-123" } });
  });

  it("throw jika key tidak ditemukan", async () => {
    findFirst.mockResolvedValue(null);

    await expect(deleteApiKey("key-tidak-ada", "user-123")).rejects.toThrow(
      "API key tidak ditemukan",
    );
    expect(del).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("validateApiKey", () => {
  it("mengembalikan user jika key valid dan aktif", async () => {
    findUnique.mockResolvedValue({
      id: "key-123",
      isActive: true,
      user: { id: "user-123", email: "ocir@test.com", role: "user" },
    });

    const result = await validateApiKey("rwp_abc123");

    expect(result).toEqual({
      id: "user-123",
      email: "ocir@test.com",
      role: "user",
    });
  });

  it("mengembalikan null jika key tidak ditemukan", async () => {
    findUnique.mockResolvedValue(null);

    const result = await validateApiKey("rwp_tidak_ada");

    expect(result).toBeNull();
  });

  it("mengembalikan null jika key sudah direvoke (isActive: false)", async () => {
    findUnique.mockResolvedValue({
      id: "key-123",
      isActive: false,
      user: { id: "user-123", email: "ocir@test.com", role: "user" },
    });

    const result = await validateApiKey("rwp_abc123");

    expect(result).toBeNull();
  });
});
