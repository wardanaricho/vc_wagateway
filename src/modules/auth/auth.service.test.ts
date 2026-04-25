import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}));

// Set env JWT
process.env.JWT_ACCESS_SECRET =
  "test_access_secret_panjang_minimal_64_karakter_supaya_aman_ya";
process.env.JWT_REFRESH_SECRET =
  "test_refresh_secret_panjang_minimal_64_karakter_supaya_aman_ya";

import bcrypt from "bcryptjs";
import { registerUser, loginUser, refreshTokens } from "./auth.service.js";
import { prisma } from "../../../lib/prisma.js";

const mockUser = {
  id: "user-123",
  name: "Ocir",
  email: "ocir@test.com",
  username: "ocir",
  password: "hashed_password",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerUser", () => {
  it("berhasil register user baru", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const result = await registerUser({
      name: "Ocir",
      email: "ocir@test.com",
      username: "ocir",
      password: "password123",
    });

    expect(prisma.user.findFirst).toHaveBeenCalledOnce();
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
    expect(result.email).toBe("ocir@test.com");
  });

  it("throw jika email sudah terdaftar", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);

    await expect(
      registerUser({
        name: "Ocir",
        email: "ocir@test.com",
        username: "ocir_baru",
        password: "password123",
      }),
    ).rejects.toThrow("email sudah terdaftar");
  });

  it("throw jika username sudah terdaftar", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      ...mockUser,
      email: "beda@test.com", // email beda
    });

    await expect(
      registerUser({
        name: "Ocir",
        email: "ocir@test.com",
        username: "ocir",
        password: "password123",
      }),
    ).rejects.toThrow("username sudah terdaftar");
  });
});

describe("loginUser", () => {
  it("berhasil login dan return token", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await loginUser({
      email: "ocir@test.com",
      password: "password123",
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe("ocir@test.com");
  });

  it("throw jika user tidak ditemukan", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      loginUser({ email: "tidakada@test.com", password: "password123" }),
    ).rejects.toThrow("Email atau password salah");
  });

  it("throw jika password salah", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      loginUser({ email: "ocir@test.com", password: "salah" }),
    ).rejects.toThrow("Email atau password salah");
  });
});

describe("refreshTokens", () => {
  it("berhasil refresh token", async () => {
    // buat refresh token valid dulu
    const { signRefreshToken } = await import("../../utils/jwt.js");
    const validRefreshToken = signRefreshToken({
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

    const result = await refreshTokens(validRefreshToken);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it("throw jika refresh token tidak valid", async () => {
    await expect(refreshTokens("token.palsu.banget")).rejects.toThrow();
  });

  it("throw jika user sudah dihapus dari DB", async () => {
    const { signRefreshToken } = await import("../../utils/jwt.js");
    const validRefreshToken = signRefreshToken({
      sub: "user-sudah-dihapus",
      email: mockUser.email,
      role: mockUser.role,
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(refreshTokens(validRefreshToken)).rejects.toThrow(
      "User tidak ditemukan",
    );
  });
});
