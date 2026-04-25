import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    autoReply: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "../../../lib/prisma.js";
import {
  createAutoReply,
  getAutoRepliesByUser,
  getAutoReplyById,
  updateAutoReply,
  deleteAutoReply,
  processAutoReply,
} from "./auto-reply.service.js";

const create = prisma.autoReply.create as unknown as ReturnType<typeof vi.fn>;
const findMany = prisma.autoReply.findMany as unknown as ReturnType<
  typeof vi.fn
>;
const findFirst = prisma.autoReply.findFirst as unknown as ReturnType<
  typeof vi.fn
>;
const update = prisma.autoReply.update as unknown as ReturnType<typeof vi.fn>;
const del = prisma.autoReply.delete as unknown as ReturnType<typeof vi.fn>;

const mockRule = {
  id: "rule-123",
  userId: "user-123",
  sessionId: null,
  keyword: "halo",
  matchType: "exact",
  response: "Halo juga!",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("createAutoReply", () => {
  it("berhasil membuat rule baru", async () => {
    create.mockResolvedValue(mockRule);

    const result = await createAutoReply("user-123", {
      keyword: "halo",
      matchType: "exact",
      response: "Halo juga!",
    });

    expect(create).toHaveBeenCalledOnce();
    expect(result.keyword).toBe("halo");
  });

  it("isActive default true jika tidak diisi", async () => {
    create.mockResolvedValue(mockRule);

    await createAutoReply("user-123", {
      keyword: "halo",
      matchType: "exact",
      response: "Halo juga!",
    });

    const calledData = create.mock.calls[0]?.[0]?.data as { isActive: boolean };
    expect(calledData.isActive).toBe(true);
  });
});

describe("getAutoRepliesByUser", () => {
  it("mengembalikan semua rules milik user", async () => {
    findMany.mockResolvedValue([mockRule]);

    const result = await getAutoRepliesByUser("user-123");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-123" } }),
    );
    expect(result).toHaveLength(1);
  });

  it("filter by sessionId jika diberikan", async () => {
    findMany.mockResolvedValue([mockRule]);

    await getAutoRepliesByUser("user-123", "session-abc");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ sessionId: "session-abc" }, { sessionId: null }],
        }),
      }),
    );
  });
});

describe("getAutoReplyById", () => {
  it("mengembalikan rule jika ditemukan", async () => {
    findFirst.mockResolvedValue(mockRule);

    const result = await getAutoReplyById("rule-123", "user-123");

    expect(result.id).toBe("rule-123");
  });

  it("throw jika tidak ditemukan", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getAutoReplyById("rule-xxx", "user-123")).rejects.toThrow(
      "AutoReply tidak ditemukan",
    );
  });
});

describe("updateAutoReply", () => {
  it("berhasil update rule", async () => {
    findFirst.mockResolvedValue(mockRule);
    update.mockResolvedValue({ ...mockRule, keyword: "hai" });

    const result = await updateAutoReply("rule-123", "user-123", {
      keyword: "hai",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rule-123" },
        data: { keyword: "hai" },
      }),
    );
    expect(result.keyword).toBe("hai");
  });

  it("throw jika rule tidak ditemukan", async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      updateAutoReply("rule-xxx", "user-123", { keyword: "hai" }),
    ).rejects.toThrow("AutoReply tidak ditemukan");

    expect(update).not.toHaveBeenCalled();
  });
});

describe("deleteAutoReply", () => {
  it("berhasil menghapus rule", async () => {
    findFirst.mockResolvedValue(mockRule);
    del.mockResolvedValue(mockRule);

    await deleteAutoReply("rule-123", "user-123");

    expect(del).toHaveBeenCalledWith({ where: { id: "rule-123" } });
  });

  it("throw jika rule tidak ditemukan", async () => {
    findFirst.mockResolvedValue(null);

    await expect(deleteAutoReply("rule-xxx", "user-123")).rejects.toThrow(
      "AutoReply tidak ditemukan",
    );
    expect(del).not.toHaveBeenCalled();
  });
});

describe("processAutoReply", () => {
  it("mengembalikan response jika ada rule yang cocok", async () => {
    findMany.mockResolvedValue([
      { keyword: "halo", matchType: "exact", response: "Halo juga!" },
    ]);

    const result = await processAutoReply("user-123", "session-123", "halo");

    expect(result).toBe("Halo juga!");
  });

  it("mengembalikan null jika tidak ada yang cocok", async () => {
    findMany.mockResolvedValue([
      { keyword: "halo", matchType: "exact", response: "Halo juga!" },
    ]);

    const result = await processAutoReply(
      "user-123",
      "session-123",
      "selamat pagi",
    );

    expect(result).toBeNull();
  });

  it("mengembalikan null jika tidak ada rules", async () => {
    findMany.mockResolvedValue([]);

    const result = await processAutoReply("user-123", "session-123", "halo");

    expect(result).toBeNull();
  });
});
