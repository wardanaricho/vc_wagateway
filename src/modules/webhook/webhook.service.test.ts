import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma.js", () => ({
  prisma: {
    webhook: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("./webhook.dispatcher.js", () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../../../lib/prisma.js";
import { dispatchWebhook } from "./webhook.dispatcher.js";
import {
  createWebhook,
  getWebhooksByUser,
  getWebhookById,
  updateWebhook,
  deleteWebhook,
  triggerWebhooks,
} from "./webhook.service.js";

const create = prisma.webhook.create as unknown as ReturnType<typeof vi.fn>;
const findMany = prisma.webhook.findMany as unknown as ReturnType<typeof vi.fn>;
const findFirst = prisma.webhook.findFirst as unknown as ReturnType<
  typeof vi.fn
>;
const update = prisma.webhook.update as unknown as ReturnType<typeof vi.fn>;
const del = prisma.webhook.delete as unknown as ReturnType<typeof vi.fn>;
const dispatch = dispatchWebhook as unknown as ReturnType<typeof vi.fn>;

const mockWebhook = {
  id: "wh-123",
  userId: "user-123",
  url: "https://example.com/webhook",
  events: "message.received,message.sent",
  secret: "mysecret",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("createWebhook", () => {
  it("berhasil membuat webhook baru", async () => {
    create.mockResolvedValue(mockWebhook);

    const result = await createWebhook("user-123", {
      url: "https://example.com/webhook",
      events: ["message.received", "message.sent"],
      secret: "mysecret",
    });

    expect(create).toHaveBeenCalledOnce();

    const calledData = create.mock.calls[0]?.[0]?.data as {
      events: string;
      isActive: boolean;
    };
    expect(calledData.events).toBe("message.received,message.sent");
    expect(calledData.isActive).toBe(true);
    expect(result.url).toBe("https://example.com/webhook");
  });
});

describe("getWebhooksByUser", () => {
  it("mengembalikan list webhooks milik user", async () => {
    findMany.mockResolvedValue([mockWebhook]);

    const result = await getWebhooksByUser("user-123");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-123" } }),
    );
    expect(result).toHaveLength(1);
  });

  it("mengembalikan array kosong jika tidak ada webhook", async () => {
    findMany.mockResolvedValue([]);
    const result = await getWebhooksByUser("user-123");
    expect(result).toHaveLength(0);
  });
});

describe("getWebhookById", () => {
  it("mengembalikan webhook jika ditemukan", async () => {
    findFirst.mockResolvedValue(mockWebhook);
    const result = await getWebhookById("wh-123", "user-123");
    expect(result.id).toBe("wh-123");
  });

  it("throw jika tidak ditemukan", async () => {
    findFirst.mockResolvedValue(null);
    await expect(getWebhookById("wh-xxx", "user-123")).rejects.toThrow(
      "Webhook tidak ditemukan",
    );
  });
});

describe("updateWebhook", () => {
  it("berhasil update webhook", async () => {
    findFirst.mockResolvedValue(mockWebhook);
    update.mockResolvedValue({ ...mockWebhook, url: "https://new.com" });

    const result = await updateWebhook("wh-123", "user-123", {
      url: "https://new.com",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wh-123" },
        data: { url: "https://new.com" },
      }),
    );
    expect(result.url).toBe("https://new.com");
  });

  it("events di-join jadi string saat update", async () => {
    findFirst.mockResolvedValue(mockWebhook);
    update.mockResolvedValue(mockWebhook);

    await updateWebhook("wh-123", "user-123", {
      events: ["message.received"],
    });

    const calledData = update.mock.calls[0]?.[0]?.data as { events: string };
    expect(calledData.events).toBe("message.received");
  });

  it("throw jika tidak ditemukan", async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      updateWebhook("wh-xxx", "user-123", { url: "https://new.com" }),
    ).rejects.toThrow("Webhook tidak ditemukan");
    expect(update).not.toHaveBeenCalled();
  });
});

describe("deleteWebhook", () => {
  it("berhasil menghapus webhook", async () => {
    findFirst.mockResolvedValue(mockWebhook);
    del.mockResolvedValue(mockWebhook);

    await deleteWebhook("wh-123", "user-123");

    expect(del).toHaveBeenCalledWith({ where: { id: "wh-123" } });
  });

  it("throw jika tidak ditemukan", async () => {
    findFirst.mockResolvedValue(null);
    await expect(deleteWebhook("wh-xxx", "user-123")).rejects.toThrow(
      "Webhook tidak ditemukan",
    );
    expect(del).not.toHaveBeenCalled();
  });
});

describe("triggerWebhooks", () => {
  it("dispatch ke semua webhook yang subscribe event ini", async () => {
    findMany.mockResolvedValue([
      { url: "https://a.com", events: "message.received", secret: null },
      {
        url: "https://b.com",
        events: "message.received,message.sent",
        secret: "s",
      },
    ]);

    await triggerWebhooks("user-123", "message.received", "session-123", {
      from: "628xxx",
    });

    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("tidak dispatch ke webhook yang tidak subscribe event ini", async () => {
    findMany.mockResolvedValue([
      { url: "https://a.com", events: "message.sent", secret: null },
    ]);

    await triggerWebhooks("user-123", "message.received", "session-123", {});

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("tidak dispatch jika tidak ada webhook", async () => {
    findMany.mockResolvedValue([]);

    await triggerWebhooks("user-123", "message.received", "session-123", {});

    expect(dispatch).not.toHaveBeenCalled();
  });
});
