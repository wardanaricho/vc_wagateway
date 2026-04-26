import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    waSession: { count: vi.fn(), findMany: vi.fn() },
    message: { count: vi.fn(), findMany: vi.fn() },
    apiKey: { count: vi.fn() },
    autoReply: { count: vi.fn() },
    webhook: { count: vi.fn() },
  },
}));

vi.mock("../anti-ban/anti-ban.queue.js", () => ({
  isConnected: vi.fn().mockReturnValue(false),
  getQueueLength: vi.fn().mockReturnValue(0),
}));

import { prisma } from "../../../lib/prisma.js";
import {
  getOverview,
  getSessionsStats,
  getMessageStats,
  getRecentActivity,
} from "./dashboard.service.js";

const waSessionCount = prisma.waSession.count as unknown as ReturnType<
  typeof vi.fn
>;
const waSessionFind = prisma.waSession.findMany as unknown as ReturnType<
  typeof vi.fn
>;
const messageCount = prisma.message.count as unknown as ReturnType<
  typeof vi.fn
>;
const messageFind = prisma.message.findMany as unknown as ReturnType<
  typeof vi.fn
>;
const apiKeyCount = prisma.apiKey.count as unknown as ReturnType<typeof vi.fn>;
const autoReplyCount = prisma.autoReply.count as unknown as ReturnType<
  typeof vi.fn
>;
const webhookCount = prisma.webhook.count as unknown as ReturnType<
  typeof vi.fn
>;

beforeEach(() => vi.clearAllMocks());

describe("getOverview", () => {
  it("mengembalikan semua total dengan benar", async () => {
    waSessionCount.mockResolvedValue(3);
    messageCount.mockResolvedValue(150);
    apiKeyCount.mockResolvedValue(2);
    autoReplyCount.mockResolvedValue(5);
    webhookCount.mockResolvedValue(1);

    const result = await getOverview("user-123");

    expect(result).toEqual({
      totalSessions: 3,
      totalMessages: 150,
      totalApiKeys: 2,
      totalAutoReplies: 5,
      totalWebhooks: 1,
    });
  });

  it("mengembalikan 0 jika tidak ada data", async () => {
    waSessionCount.mockResolvedValue(0);
    messageCount.mockResolvedValue(0);
    apiKeyCount.mockResolvedValue(0);
    autoReplyCount.mockResolvedValue(0);
    webhookCount.mockResolvedValue(0);

    const result = await getOverview("user-baru");

    expect(result.totalSessions).toBe(0);
    expect(result.totalMessages).toBe(0);
  });
});

describe("getSessionsStats", () => {
  it("mengembalikan sessions dengan isConnected dan queueLength", async () => {
    waSessionFind.mockResolvedValue([
      {
        id: "session-123",
        name: "Toko",
        phone: "628xxx",
        status: "connected",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await getSessionsStats("user-123");

    expect(result[0]).toHaveProperty("isConnected");
    expect(result[0]).toHaveProperty("queueLength");
    expect(result[0]?.name).toBe("Toko");
  });

  it("mengembalikan array kosong jika tidak ada session", async () => {
    waSessionFind.mockResolvedValue([]);
    const result = await getSessionsStats("user-123");
    expect(result).toHaveLength(0);
  });
});

describe("getMessageStats", () => {
  it("mengembalikan 7 hari data", async () => {
    messageFind.mockResolvedValue([]);

    const result = await getMessageStats("user-123");

    expect(result).toHaveLength(7);
    expect(result[0]).toHaveProperty("date");
    expect(result[0]).toHaveProperty("sent");
    expect(result[0]).toHaveProperty("received");
  });

  it("menghitung sent dan received dengan benar", async () => {
    const today = new Date().toISOString().split("T")[0];
    messageFind.mockResolvedValue([
      { fromMe: true, createdAt: new Date() },
      { fromMe: true, createdAt: new Date() },
      { fromMe: false, createdAt: new Date() },
    ]);

    const result = await getMessageStats("user-123");
    const todayData = result.find((r) => r.date === today);

    expect(todayData?.sent).toBe(2);
    expect(todayData?.received).toBe(1);
  });
});

describe("getRecentActivity", () => {
  it("mengembalikan gabungan message dan session activities", async () => {
    messageFind.mockResolvedValue([
      {
        id: "msg-1",
        remoteJid: "628xxx@s.whatsapp.net",
        fromMe: false,
        content: "Halo",
        sessionId: "session-123",
        createdAt: new Date(),
      },
    ]);

    waSessionFind.mockResolvedValue([
      {
        id: "session-123",
        name: "Toko",
        status: "connected",
        updatedAt: new Date(),
      },
    ]);

    const result = await getRecentActivity("user-123");

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("type");
    expect(result[0]).toHaveProperty("description");
    expect(result[0]).toHaveProperty("timestamp");
  });

  it("mengembalikan array kosong jika tidak ada data", async () => {
    messageFind.mockResolvedValue([]);
    waSessionFind.mockResolvedValue([]);

    const result = await getRecentActivity("user-123");
    expect(result).toHaveLength(0);
  });
});
