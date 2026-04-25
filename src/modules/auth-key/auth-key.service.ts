import { prisma } from "../../../lib/prisma.js";

/**
 * Ambil satu key berdasarkan sessionId + keyId
 */
export async function getAuthKey(sessionId: string, keyId: string) {
  const record = await prisma.authKey.findUnique({
    where: { sessionId_keyId: { sessionId, keyId } },
    select: { data: true },
  });

  if (!record) return null;

  try {
    return JSON.parse(record.data) as unknown;
  } catch {
    return null;
  }
}

/**
 * Ambil semua keys milik satu session (untuk bulk load saat reconnect)
 */
export async function getAllAuthKeys(sessionId: string) {
  const records = await prisma.authKey.findMany({
    where: { sessionId },
    select: { keyId: true, data: true },
  });

  return Object.fromEntries(
    records.map((r) => {
      try {
        return [r.keyId, JSON.parse(r.data) as unknown];
      } catch {
        return [r.keyId, null];
      }
    }),
  );
}

/**
 * Simpan atau update satu key (upsert)
 */
export async function setAuthKey(
  sessionId: string,
  keyId: string,
  data: unknown,
) {
  await prisma.authKey.upsert({
    where: { sessionId_keyId: { sessionId, keyId } },
    create: {
      sessionId,
      keyId,
      data: JSON.stringify(data),
    },
    update: {
      data: JSON.stringify(data),
    },
  });
}

/**
 * Simpan banyak keys sekaligus (dipanggil Baileys saat saveCreds)
 */
export async function setManyAuthKeys(
  sessionId: string,
  keys: Record<string, unknown>,
) {
  const upserts = Object.entries(keys).map(([keyId, data]) =>
    prisma.authKey.upsert({
      where: { sessionId_keyId: { sessionId, keyId } },
      create: {
        sessionId,
        keyId,
        data: JSON.stringify(data),
      },
      update: {
        data: JSON.stringify(data),
      },
    }),
  );

  await prisma.$transaction(upserts);
}

/**
 * Hapus semua keys milik session (dipanggil saat session dihapus/logout)
 */
export async function deleteAuthKeys(sessionId: string) {
  await prisma.authKey.deleteMany({ where: { sessionId } });
}
