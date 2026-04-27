import type { Request, Response } from "express";
import {
  connectSession,
  disconnectSession,
  getSocket,
  isConnected,
} from "./baileys.manager.js";
import { prisma } from "../../../lib/prisma.js";
import { toWhatsAppJid } from "../anti-ban/anti-ban.utils.js";
import { enqueueMessage, getQueueLength } from "../anti-ban/anti-ban.queue.js";

async function getOwnedSession(sessionId: string, userId: string) {
  return prisma.waSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, status: true, qr: true, name: true },
  });
}

// ── connect ───────────────────────────────────────────────────────────────────
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

// ── get QR ────────────────────────────────────────────────────────────────────
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

  res
    .status(200)
    .json({ success: true, data: { qr: session.qr, status: session.status } });
}

// ── disconnect ────────────────────────────────────────────────────────────────
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

// ── send message ──────────────────────────────────────────────────────────────
export async function sendMessage(req: Request, res: Response) {
  const userId = req.user!.sub;
  const sessionId = req.params["id"] as string;
  const body = req.body;

  if (!body.to) {
    res.status(400).json({ success: false, message: "to wajib diisi" });
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
    res
      .status(400)
      .json({ success: false, message: "Session tidak terkoneksi" });
    return;
  }

  try {
    const jid = toWhatsAppJid(body.to);
    let payload: any = {};

    switch (body.type) {
      case "text":
      default:
        payload = { text: body.message ?? "" };
        break;

      case "image":
        payload = {
          image: { url: body.url },
          caption: body.caption ?? "",
        };
        break;

      case "video":
        payload = {
          video: { url: body.url },
          caption: body.caption ?? "",
          gifPlayback: body.gifPlayback ?? false,
        };
        break;

      case "audio":
        payload = {
          audio: { url: body.url },
          ptt: body.ptt ?? false,
        };
        break;

      case "sticker":
        payload = {
          sticker: { url: body.url },
        };
        break;

      case "document":
        payload = {
          document: { url: body.url },
          mimetype: body.mimetype ?? "application/octet-stream",
          fileName: body.fileName ?? "file",
          caption: body.caption ?? "",
        };
        break;

      case "location":
        payload = {
          location: {
            degreesLatitude: parseFloat(body.latitude),
            degreesLongitude: parseFloat(body.longitude),
            name: body.locationName ?? "",
          },
        };
        break;

      case "liveLocation":
        payload = {
          location: {
            degreesLatitude: parseFloat(body.latitude),
            degreesLongitude: parseFloat(body.longitude),
            name: body.locationName ?? "",
            accuracyInMeters: 10,
          },
        };
        break;

      case "contact":
        payload = {
          contacts: {
            displayName: body.contactName,
            contacts: [
              {
                vcard: [
                  "BEGIN:VCARD",
                  "VERSION:3.0",
                  `FN:${body.contactName}`,
                  `TEL;type=CELL;type=VOICE;waid=${body.contactPhone.replace(/\D/g, "")}:+${body.contactPhone.replace(/\D/g, "")}`,
                  "END:VCARD",
                ].join("\n"),
              },
            ],
          },
        };
        break;

      case "poll":
        payload = {
          poll: {
            name: body.pollQuestion,
            values: body.pollOptions ?? [],
            selectableCount: body.selectableCount ?? 1,
          },
        };
        break;
      case "list":
        payload = {
          text: body.text ?? "",
          footer: body.footer ?? "",
          title: body.title ?? "",
          buttons: [
            {
              buttonId: "list_btn",
              buttonText: { displayText: body.buttonText ?? "Pilih" },
              type: 4,
              nativeFlowInfo: {
                name: "single_select",
                paramsJson: JSON.stringify({
                  title: body.buttonText ?? "Pilih",
                  sections: (body.sections ?? []).map((s: any) => ({
                    title: s.title ?? "",
                    highlight_label: s.highlight_label ?? "",
                    rows: (s.rows ?? []).map((r: any) => ({
                      header: r.header ?? "",
                      title: r.title ?? "",
                      description: r.description ?? "",
                      id: r.id ?? r.rowId ?? String(Date.now()),
                    })),
                  })),
                }),
              },
            },
          ],
          headerType: 1,
        };
        break;

      case "buttons":
        payload = {
          text: body.text ?? "",
          footer: body.footer ?? "",
          buttons: (body.buttons ?? []).map((btn: any) => ({
            buttonId: btn.buttonId,
            buttonText: { displayText: btn.buttonText?.displayText ?? "" },
            type: 1,
          })),
          headerType: 1,
        };
        break;

      case "template":
        payload = {
          text: body.text ?? "",
          footer: body.footer ?? "",
          templateButtons: body.templateButtons ?? [],
        };
        break;

      case "reaction":
        payload = {
          react: {
            text: body.emoji,
            key: {
              remoteJid: jid,
              id: body.messageId,
              fromMe: body.fromMe ?? false,
            },
          },
        };
        break;

      case "delete":
        payload = {
          delete: {
            remoteJid: jid,
            id: body.messageId,
            fromMe: body.fromMe ?? true,
          },
        };
        break;

      case "event":
        payload = {
          event: {
            name: body.eventName ?? "",
            description: body.eventDescription ?? "",
            startDate: body.eventStartDate
              ? new Date(body.eventStartDate)
              : new Date(),
            endDate: body.eventEndDate
              ? new Date(body.eventEndDate)
              : undefined,
            location: body.eventLocation
              ? { name: body.eventLocation }
              : undefined,
          },
        };
        break;
    }

    console.log("PAYLOAD:", JSON.stringify(payload, null, 2));
    const messageId = await enqueueMessage(sessionId, sock, jid, payload);

    res.status(200).json({
      success: true,
      data: {
        messageId,
        to: jid,
        type: body.type ?? "text",
        queueLength: getQueueLength(sessionId),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengirim pesan";
    const status = msg.includes("Limit") || msg.includes("penuh") ? 429 : 500;
    res.status(status).json({ success: false, message: msg });
  }
}

// ── get status ────────────────────────────────────────────────────────────────
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

// ── get messages ──────────────────────────────────────────────────────────────
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
