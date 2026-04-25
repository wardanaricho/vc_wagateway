import bcrypt from "bcryptjs";
import type { LoginBody, RegisterBody } from "./auth.types.js";
import { prisma } from "../../../lib/prisma.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";

const SALT_ROUNDS = 12;

export async function registerUser(body: RegisterBody) {
  const { name, email, username, password } = body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });

  if (existing) {
    const field = existing.email === email ? "email" : "username";
    throw new Error(`${field} sudah terdaftar`);
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      username,
      password: hashed,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

export async function loginUser(body: LoginBody) {
  const { email, password } = body;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      password: true,
    },
  });

  if (!user) throw new Error("Email atau password salah");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Email atau password salah");

  const payload = { sub: user.id, email: user.email, role: user.role };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  };
}

export async function refreshTokens(token: string) {
  const decoded = verifyRefreshToken(token); // throw jika expired/invalid

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: { id: true, email: true, role: true },
  });

  if (!user) throw new Error("User tidak ditemukan");

  const payload = { sub: user.id, email: user.email, role: user.role };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}
