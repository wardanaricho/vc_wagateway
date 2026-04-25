import { randomBytes } from "crypto";
import { prisma } from "../../../lib/prisma.js";
import type { CreateApiKeyBody, UpdateApiKeyBody } from "./api-key.types.js";

function generateKey(): string {
  // format: rwp_<32 random hex chars>
  return `rwp_${randomBytes(16).toString("hex")}`;
}

export async function createApiKey(
  userId: string,
  body: CreateApiKeyBody,
): Promise<unknown> {
  const key = generateKey();

  return prisma.apiKey.create({
    data: { userId, name: body.name, key },
    select: {
      id: true,
      name: true,
      key: true, // ← hanya ditampilkan sekali saat create
      isActive: true,
      createdAt: true,
    },
  });
}

export async function getApiKeysByUser(userId: string): Promise<unknown[]> {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      key: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeApiKey(keyId: string, userId: string) {
  const existing = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("API key tidak ditemukan");

  return prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
    select: { id: true, name: true, isActive: true },
  });
}

export async function deleteApiKey(id: string, userId: string): Promise<void> {
  const existing = await prisma.apiKey.findFirst({
    where: { id: id, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("API key tidak ditemukan");

  await prisma.apiKey.delete({ where: { id: id } });
}

export async function validateApiKey(key: string) {
  const record = await prisma.apiKey.findUnique({
    where: { key },
    select: {
      id: true,
      isActive: true,
      user: {
        select: { id: true, email: true, role: true },
      },
    },
  });

  if (!record || !record.isActive) return null;

  return record.user;
}
