import type { Request, Response } from "express";
import {
  createWebhook,
  getWebhooksByUser,
  getWebhookById,
  updateWebhook,
  deleteWebhook,
} from "./webhook.service.js";
import type {
  CreateWebhookBody,
  UpdateWebhookBody,
  WebhookEvent,
} from "./webhook.types.js";

const VALID_EVENTS: WebhookEvent[] = [
  "message.received",
  "message.sent",
  "session.connected",
  "session.disconnected",
];

export async function create(req: Request, res: Response) {
  const userId = req.user!.sub;
  const body = req.body as CreateWebhookBody;

  if (!body.url || !body.events?.length) {
    res.status(400).json({
      success: false,
      message: "url dan events wajib diisi",
    });
    return;
  }

  const invalidEvents = body.events.filter((e) => !VALID_EVENTS.includes(e));
  if (invalidEvents.length > 0) {
    res.status(400).json({
      success: false,
      message: `Event tidak valid: ${invalidEvents.join(", ")}. Valid: ${VALID_EVENTS.join(", ")}`,
    });
    return;
  }

  try {
    const data = await createWebhook(userId, body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membuat webhook";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function index(req: Request, res: Response) {
  const userId = req.user!.sub;

  try {
    const data = await getWebhooksByUser(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil webhooks";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function show(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;

  try {
    const data = await getWebhookById(id, userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil webhook";
    res.status(404).json({ success: false, message: msg });
  }
}

export async function update(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;
  const body = req.body as UpdateWebhookBody;

  if (body.events) {
    const invalidEvents = body.events.filter((e) => !VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      res.status(400).json({
        success: false,
        message: `Event tidak valid: ${invalidEvents.join(", ")}`,
      });
      return;
    }
  }

  try {
    const data = await updateWebhook(id, userId, body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal update webhook";
    res.status(404).json({ success: false, message: msg });
  }
}

export async function destroy(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;

  try {
    await deleteWebhook(id, userId);
    res
      .status(200)
      .json({ success: true, message: "Webhook berhasil dihapus" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus webhook";
    res.status(404).json({ success: false, message: msg });
  }
}
