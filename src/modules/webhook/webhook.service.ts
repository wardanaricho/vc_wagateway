import { prisma } from "../../../lib/prisma.js";
import { dispatchWebhook } from "./webhook.dispatcher.js";
import type {
  CreateWebhookBody,
  UpdateWebhookBody,
  WebhookEvent,
  WebhookPayload,
} from "./webhook.types.js";

export async function createWebhook(userId: string, body: CreateWebhookBody) {
  return prisma.webhook.create({
    data: {
      userId,
      url: body.url,
      events: body.events.join(","),
      secret: body.secret ?? null,
      isActive: body.isActive ?? true,
    },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function getWebhooksByUser(userId: string) {
  return prisma.webhook.findMany({
    where: { userId },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWebhookById(id: string, userId: string) {
  const webhook = await prisma.webhook.findFirst({
    where: { id, userId },
    select: {
      id: true,
      url: true,
      events: true,
      secret: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!webhook) throw new Error("Webhook tidak ditemukan");
  return webhook;
}

export async function updateWebhook(
  id: string,
  userId: string,
  body: UpdateWebhookBody,
) {
  const existing = await prisma.webhook.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("Webhook tidak ditemukan");

  return prisma.webhook.update({
    where: { id },
    data: {
      ...(body.url !== undefined && { url: body.url }),
      ...(body.events !== undefined && { events: body.events.join(",") }),
      ...(body.secret !== undefined && { secret: body.secret }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

export async function deleteWebhook(id: string, userId: string) {
  const existing = await prisma.webhook.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("Webhook tidak ditemukan");

  await prisma.webhook.delete({ where: { id } });
}

/**
 * Dipanggil oleh Baileys manager saat ada event.
 * Fire and forget — tidak perlu await di caller.
 */
export async function triggerWebhooks(
  userId: string,
  event: WebhookEvent,
  sessionId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: { userId, isActive: true },
    select: { url: true, events: true, secret: true },
  });

  const payload: WebhookPayload = {
    event,
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  };

  const targets = webhooks.filter((w) => w.events.split(",").includes(event));

  // dispatch semua secara paralel, jangan tunggu
  await Promise.allSettled(
    targets.map((w) =>
      dispatchWebhook({ url: w.url, secret: w.secret }, payload),
    ),
  );
}
