import type { Request, Response } from "express";
import {
  connectSession,
  disconnectSession,
  getSocket,
  isConnected,
} from "./baileys.manager.js";
import { prisma } from "../../../lib/prisma.js";
import type { SendMessageBody } from "./baileys.types.js";
import { toWhatsAppJid } from "../anti-ban/anti-ban.utils.js";
import { enqueueMessage, getQueueLength } from "../anti-ban/anti-ban.queue.js";

// ── helper: pastikan session milik user ───────────────────────────────────
async function getOwnedSession(sessionId: string, userId: string) {
  return prisma.waSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, status: true, qr: true, name: true },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/connect
// ─────────────────────────────────────────────────────────────────────────────
export async function connect(req: Request, res: Response) {
  const userId = req.user!.sub;
  const sessionId = req.params["id"] as string;

  const session = await getOwnedSession(sessionId, userId);
  if (!session) {
    res
      .status(404)
      .json({ success: false, message: "Session tidak ditemukan" });
    return;
  }

  if (isConnected(sessionId)) {
    res
      .status(400)
      .json({ success: false, message: "Session sudah terkoneksi" });
    return;
  }

  try {
    // jalankan tanpa await — connectSession berjalan di background
    connectSession(sessionId).catch(console.error);

    res.status(200).json({
      success: true,
      message: "Proses koneksi dimulai, tunggu QR code",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memulai koneksi";
    res.status(500).json({ success: false, message: msg });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/:id/qr
// ─────────────────────────────────────────────────────────────────────────────
export async function getQr(req: Request, res: Response) {
  const userId = req.user!.sub;
  const sessionId = req.params["id"] as string;

  const session = await getOwnedSession(sessionId, userId);
  if (!session) {
    res
      .status(404)
      .json({ success: false, message: "Session tidak ditemukan" });
    return;
  }

  if (session.status === "connected") {
    res.status(400).json({
      success: false,
      message: "Session sudah terkoneksi, tidak perlu QR",
    });
    return;
  }

  if (!session.qr) {
    res.status(404).json({
      success: false,
      message: "QR belum tersedia, coba lagi sebentar",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      qr: session.qr, // base64 image, langsung bisa di <img src="...">
      status: session.status,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/disconnect
// ─────────────────────────────────────────────────────────────────────────────
export async function disconnect(req: Request, res: Response) {
  const userId = req.user!.sub;
  const sessionId = req.params["id"] as string;

  const session = await getOwnedSession(sessionId, userId);
  if (!session) {
    res
      .status(404)
      .json({ success: false, message: "Session tidak ditemukan" });
    return;
  }

  if (!isConnected(sessionId)) {
    res
      .status(400)
      .json({ success: false, message: "Session tidak sedang terkoneksi" });
    return;
  }

  try {
    await disconnectSession(sessionId);
    res
      .status(200)
      .json({ success: true, message: "Session berhasil disconnect" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal disconnect";
    res.status(500).json({ success: false, message: msg });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/send
// ─────────────────────────────────────────────────────────────────────────────
export async function sendMessage(req: Request, res: Response) {
  const userId = req.user!.sub;
  const sessionId = req.params["id"] as string;
  const body = req.body as SendMessageBody;

  if (!body.to || !body.message) {
    res.status(400).json({
      success: false,
      message: "to dan message wajib diisi",
    });
    return;
  }

  const session = await getOwnedSession(sessionId, userId);
  if (!session) {
    res
      .status(404)
      .json({ success: false, message: "Session tidak ditemukan" });
    return;
  }

  const sock = getSocket(sessionId);
  if (!sock) {
    res.status(400).json({
      success: false,
      message: "Session tidak terkoneksi",
    });
    return;
  }

  try {
    const jid = toWhatsAppJid(body.to); // ✅ pakai helper format nomor
    const messageId = await enqueueMessage(sessionId, sock, jid, body.message);

    res.status(200).json({
      success: true,
      data: {
        messageId,
        to: jid,
        queueLength: getQueueLength(sessionId),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengirim pesan";
    // 429 jika kena limit anti-ban
    const status = msg.includes("Limit") || msg.includes("penuh") ? 429 : 500;
    res.status(status).json({ success: false, message: msg });
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/:id/status
// ─────────────────────────────────────────────────────────────────────────────
export async function getStatus(req: Request, res: Response) {
  const userId = req.user!.sub;
  const sessionId = req.params["id"] as string;

  const session = await getOwnedSession(sessionId, userId);
  if (!session) {
    res
      .status(404)
      .json({ success: false, message: "Session tidak ditemukan" });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      id: session.id,
      name: session.name,
      status: session.status,
      connected: isConnected(sessionId),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/:id/messages
// ─────────────────────────────────────────────────────────────────────────────
export async function getMessages(req: Request, res: Response) {
  const userId = req.user!.sub;
  const sessionId = req.params["id"] as string;

  const session = await getOwnedSession(sessionId, userId);
  if (!session) {
    res
      .status(404)
      .json({ success: false, message: "Session tidak ditemukan" });
    return;
  }

  const page = parseInt((req.query["page"] as string) ?? "1");
  const limit = parseInt((req.query["limit"] as string) ?? "20");
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        remoteJid: true,
        fromMe: true,
        messageId: true,
        type: true,
        content: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.message.count({ where: { sessionId, userId } }),
  ]);

  res.status(200).json({
    success: true,
    data: messages,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
