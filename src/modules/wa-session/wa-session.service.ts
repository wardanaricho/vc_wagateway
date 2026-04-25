import { prisma } from "../../../lib/prisma.js";
import type {
  CreateSessionBody,
  UpdateSessionBody,
} from "./wa-session.types.js";

export async function createSession(userId: string, body: CreateSessionBody) {
  const session = await prisma.waSession.create({
    data: {
      userId,
      name: body.name,
      phone: body.phone ?? null,
      status: "disconnected",
    },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      createdAt: true,
    },
  });

  return session;
}

export async function getSessionsByUser(userId: string) {
  return prisma.waSession.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSessionById(sessionId: string, userId: string) {
  const session = await prisma.waSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      qr: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!session) throw new Error("Session tidak ditemukan");

  return session;
}

export async function updateSession(
  sessionId: string,
  userId: string,
  body: UpdateSessionBody,
) {
  // pastikan session milik user ini
  const existing = await prisma.waSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("Session tidak ditemukan");

  return prisma.waSession.update({
    where: { id: sessionId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.phone !== undefined && { phone: body.phone }),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function deleteSession(sessionId: string, userId: string) {
  const existing = await prisma.waSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("Session tidak ditemukan");

  await prisma.waSession.delete({ where: { id: sessionId } });
}
