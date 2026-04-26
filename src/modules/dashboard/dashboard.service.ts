import { prisma } from "../../../lib/prisma.js";
import { getQueueLength } from "../anti-ban/anti-ban.queue.js";
import { isConnected } from "../baileys/baileys.manager.js";

export async function getOverview(userId: string) {
  const [
    totalSessions,
    totalMessages,
    totalApiKeys,
    totalAutoReplies,
    totalWebhooks,
  ] = await Promise.all([
    prisma.waSession.count({ where: { userId } }),
    prisma.message.count({ where: { userId } }),
    prisma.apiKey.count({ where: { userId, isActive: true } }),
    prisma.autoReply.count({ where: { userId, isActive: true } }),
    prisma.webhook.count({ where: { userId, isActive: true } }),
  ]);

  return {
    totalSessions,
    totalMessages,
    totalApiKeys,
    totalAutoReplies,
    totalWebhooks,
  };
}

export async function getSessionsStats(userId: string) {
  const sessions = await prisma.waSession.findMany({
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

  return sessions.map((s) => ({
    ...s,
    isConnected: isConnected(s.id),
    queueLength: getQueueLength(s.id),
  }));
}

export async function getMessageStats(userId: string) {
  // pesan per hari 7 hari terakhir
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const messages = await prisma.message.findMany({
    where: {
      userId,
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      fromMe: true,
      createdAt: true,
    },
  });

  // group by tanggal
  const grouped: Record<
    string,
    { date: string; sent: number; received: number }
  > = {};

  for (const msg of messages) {
    const date = msg.createdAt.toISOString().split("T")[0]!;

    if (!grouped[date]) {
      grouped[date] = { date, sent: 0, received: 0 };
    }

    if (msg.fromMe) {
      grouped[date].sent++;
    } else {
      grouped[date].received++;
    }
  }

  // fill hari yang tidak ada pesan dengan 0
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0]!;
    result.push(grouped[date] ?? { date, sent: 0, received: 0 });
  }

  return result;
}

export async function getRecentActivity(userId: string) {
  const [recentMessages, recentSessions] = await Promise.all([
    prisma.message.findMany({
      where: { userId },
      select: {
        id: true,
        remoteJid: true,
        fromMe: true,
        content: true,
        sessionId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.waSession.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  // gabungkan dan sort berdasarkan waktu
  const activities = [
    ...recentMessages.map((m) => ({
      type: "message" as const,
      id: m.id,
      sessionId: m.sessionId,
      description: m.fromMe
        ? `Pesan terkirim ke ${m.remoteJid}`
        : `Pesan masuk dari ${m.remoteJid}`,
      preview: m.content?.slice(0, 50) ?? null,
      timestamp: m.createdAt,
    })),
    ...recentSessions.map((s) => ({
      type: "session" as const,
      id: s.id,
      sessionId: s.id,
      description: `Session "${s.name}" — ${s.status}`,
      preview: null,
      timestamp: s.updatedAt,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 15);

  return activities;
}
