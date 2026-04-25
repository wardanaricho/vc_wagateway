import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    waSession: {
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
  createSession,
  getSessionsByUser,
  getSessionById,
  updateSession,
  deleteSession,
} from "./wa-session.service.js";

const mockSession = {
  id: "session-123",
  userId: "user-123",
  name: "Toko Ocir",
  phone: "08123456789",
  status: "disconnected",
  qr: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// cast agar bisa pakai mockResolvedValue
const waCreate = prisma.waSession.create as unknown as ReturnType<typeof vi.fn>;
const waFindMany = prisma.waSession.findMany as unknown as ReturnType<
  typeof vi.fn
>;
const waFindFirst = prisma.waSession.findFirst as unknown as ReturnType<
  typeof vi.fn
>;
const waUpdate = prisma.waSession.update as unknown as ReturnType<typeof vi.fn>;
const waDelete = prisma.waSession.delete as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("createSession", () => {
  it("berhasil membuat session baru", async () => {
    waCreate.mockResolvedValue(mockSession);

    const result = await createSession("user-123", {
      name: "Toko Ocir",
      phone: "08123456789",
    });

    expect(waCreate).toHaveBeenCalledOnce();
    expect(waCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          name: "Toko Ocir",
          status: "disconnected",
        }),
      }),
    );
    expect(result.name).toBe("Toko Ocir");
  });

  it("berhasil membuat session tanpa phone (phone jadi null)", async () => {
    waCreate.mockResolvedValue({ ...mockSession, phone: null });

    const result = await createSession("user-123", { name: "Toko Ocir" });

    expect(waCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: null }),
      }),
    );
    expect(result.phone).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getSessionsByUser", () => {
  it("mengembalikan list session milik user", async () => {
    waFindMany.mockResolvedValue([mockSession]);

    const result = await getSessionsByUser("user-123");

    expect(waFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123" },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("session-123");
  });

  it("mengembalikan array kosong jika tidak ada session", async () => {
    waFindMany.mockResolvedValue([]);

    const result = await getSessionsByUser("user-tidak-punya-session");

    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getSessionById", () => {
  it("berhasil mengembalikan session yang ditemukan", async () => {
    waFindFirst.mockResolvedValue(mockSession);

    const result = await getSessionById("session-123", "user-123");

    expect(waFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-123", userId: "user-123" },
      }),
    );
    expect(result.id).toBe("session-123");
  });

  it("throw jika session tidak ditemukan", async () => {
    waFindFirst.mockResolvedValue(null);

    await expect(
      getSessionById("session-tidak-ada", "user-123"),
    ).rejects.toThrow("Session tidak ditemukan");
  });

  it("throw jika session milik user lain", async () => {
    waFindFirst.mockResolvedValue(null); // findFirst return null karena userId tidak cocok

    await expect(getSessionById("session-123", "user-lain")).rejects.toThrow(
      "Session tidak ditemukan",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("updateSession", () => {
  it("berhasil update session", async () => {
    waFindFirst.mockResolvedValue(mockSession);
    waUpdate.mockResolvedValue({ ...mockSession, name: "Nama Baru" });

    const result = await updateSession("session-123", "user-123", {
      name: "Nama Baru",
    });

    expect(waFindFirst).toHaveBeenCalledOnce();
    expect(waUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-123" },
        data: expect.objectContaining({ name: "Nama Baru" }),
      }),
    );
    expect(result.name).toBe("Nama Baru");
  });

  it("throw jika session tidak ditemukan saat update", async () => {
    waFindFirst.mockResolvedValue(null);

    await expect(
      updateSession("session-tidak-ada", "user-123", { name: "Nama Baru" }),
    ).rejects.toThrow("Session tidak ditemukan");

    expect(waUpdate).not.toHaveBeenCalled();
  });

  it("tidak update field yang tidak dikirim", async () => {
    waFindFirst.mockResolvedValue(mockSession);
    waUpdate.mockResolvedValue(mockSession);

    await updateSession("session-123", "user-123", {});

    expect(waUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {}, // tidak ada field yang di-update
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteSession", () => {
  it("berhasil menghapus session", async () => {
    waFindFirst.mockResolvedValue(mockSession);
    waDelete.mockResolvedValue(mockSession);

    await deleteSession("session-123", "user-123");

    expect(waFindFirst).toHaveBeenCalledOnce();
    expect(waDelete).toHaveBeenCalledWith({
      where: { id: "session-123" },
    });
  });

  it("throw jika session tidak ditemukan saat delete", async () => {
    waFindFirst.mockResolvedValue(null);

    await expect(
      deleteSession("session-tidak-ada", "user-123"),
    ).rejects.toThrow("Session tidak ditemukan");

    expect(waDelete).not.toHaveBeenCalled();
  });

  it("tidak bisa hapus session milik user lain", async () => {
    waFindFirst.mockResolvedValue(null); // null karena userId tidak cocok

    await expect(deleteSession("session-123", "user-lain")).rejects.toThrow(
      "Session tidak ditemukan",
    );

    expect(waDelete).not.toHaveBeenCalled();
  });
});
