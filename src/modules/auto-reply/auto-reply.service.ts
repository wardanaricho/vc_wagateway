import { prisma } from "../../../lib/prisma.js";
import type {
  CreateAutoReplyBody,
  UpdateAutoReplyBody,
} from "./auto-reply.types.js";
import { findMatchingRule } from "./auto-reply.matcher.js";

export async function createAutoReply(
  userId: string,
  body: CreateAutoReplyBody,
) {
  return prisma.autoReply.create({
    data: {
      userId,
      sessionId: body.sessionId ?? null,
      keyword: body.keyword,
      matchType: body.matchType,
      response: body.response,
      isActive: body.isActive ?? true,
    },
    select: {
      id: true,
      sessionId: true,
      keyword: true,
      matchType: true,
      response: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function getAutoRepliesByUser(userId: string, sessionId?: string) {
  return prisma.autoReply.findMany({
    where: {
      userId,
      ...(sessionId !== undefined && {
        OR: [{ sessionId }, { sessionId: null }],
      }),
    },
    select: {
      id: true,
      sessionId: true,
      keyword: true,
      matchType: true,
      response: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAutoReplyById(id: string, userId: string) {
  const rule = await prisma.autoReply.findFirst({
    where: { id, userId },
    select: {
      id: true,
      sessionId: true,
      keyword: true,
      matchType: true,
      response: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!rule) throw new Error("AutoReply tidak ditemukan");
  return rule;
}

export async function updateAutoReply(
  id: string,
  userId: string,
  body: UpdateAutoReplyBody,
) {
  const existing = await prisma.autoReply.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("AutoReply tidak ditemukan");

  return prisma.autoReply.update({
    where: { id },
    data: {
      ...(body.keyword !== undefined && { keyword: body.keyword }),
      ...(body.matchType !== undefined && { matchType: body.matchType }),
      ...(body.response !== undefined && { response: body.response }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
    select: {
      id: true,
      sessionId: true,
      keyword: true,
      matchType: true,
      response: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

export async function deleteAutoReply(id: string, userId: string) {
  const existing = await prisma.autoReply.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("AutoReply tidak ditemukan");

  await prisma.autoReply.delete({ where: { id } });
}

/**
 * Dipanggil oleh Baileys saat pesan masuk.
 * Mengembalikan response string jika ada rule yang cocok, null jika tidak.
 */
export async function processAutoReply(
  userId: string,
  sessionId: string,
  incomingText: string,
): Promise<string | null> {
  const rules = await prisma.autoReply.findMany({
    where: {
      userId,
      isActive: true,
      OR: [{ sessionId }, { sessionId: null }],
    },
    select: {
      keyword: true,
      matchType: true,
      response: true,
    },
    orderBy: { createdAt: "asc" }, // rule lama punya prioritas lebih tinggi
  });

  const matched = findMatchingRule(incomingText, rules);
  return matched?.response ?? null;
}
