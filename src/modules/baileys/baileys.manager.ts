import makeWASocket, {
  DisconnectReason,
  type WASocket,
  Browsers,
} from "baileys";
import { useDbAuthState } from "./baileys.store.js";
import { prisma } from "../../../lib/prisma.js";
import { processAutoReply } from "../auto-reply/auto-reply.service.js";
import { triggerWebhooks } from "../webhook/webhook.service.js";
import * as QRCode from "qrcode";

// ── in-memory registry ────────────────────────────────────────────────────
const sessions = new Map<string, WASocket>();
const retryCount = new Map<string, number>();
const MAX_RETRIES = 3;

export function getSocket(sessionId: string): WASocket | undefined {
  return sessions.get(sessionId);
}

export function isConnected(sessionId: string): boolean {
  return sessions.has(sessionId);
}

// ── update status di DB ───────────────────────────────────────────────────
async function updateSessionStatus(
  sessionId: string,
  status: string,
  qr?: string | null,
) {
  await prisma.waSession.update({
    where: { id: sessionId },
    data: {
      status,
      ...(qr !== undefined && { qr }),
    },
  });
}

// ── ambil userId dari session ─────────────────────────────────────────────
async function getSessionUserId(sessionId: string): Promise<string | null> {
  const session = await prisma.waSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });
  return session?.userId ?? null;
}

// ── connect ───────────────────────────────────────────────────────────────
export async function connectSession(sessionId: string): Promise<void> {
  if (sessions.has(sessionId)) return;

  const { state, saveCreds, clearCreds } = await useDbAuthState(sessionId);

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("RawWhap"),
    printQRInTerminal: false,
  });

  sessions.set(sessionId, sock);

  // ── event: creds update ──────────────────────────────────────────────
  sock.ev.on("creds.update", saveCreds);

  // ── event: connection update ─────────────────────────────────────────
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR baru diterima
    if (qr) {
      const qrBase64 = await QRCode.toDataURL(qr);
      await updateSessionStatus(sessionId, "qr", qrBase64);
      console.log(`[${sessionId}] QR updated`);
    }

    console.log(
      `[${sessionId}] connection.update:`,
      JSON.stringify({
        connection,
        hasQr: !!qr,
        error: (lastDisconnect?.error as any)?.message,
      }),
    );

    if (connection === "open") {
      await updateSessionStatus(sessionId, "connected", null);
      console.log(`[${sessionId}] Connected`);

      const userId = await getSessionUserId(sessionId);
      if (userId) {
        triggerWebhooks(userId, "session.connected", sessionId, {
          sessionId,
        }).catch(console.error);
      }
    }

    if (connection === "close") {
      sessions.delete(sessionId);

      const statusCode = (
        lastDisconnect?.error as
          | { output?: { statusCode?: number } }
          | undefined
      )?.output?.statusCode;
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut &&
        statusCode !== DisconnectReason.connectionReplaced; // ✅ stop jika 405

      console.log(`[${sessionId}] Disconnected — code: ${statusCode}`);

      const userId = await getSessionUserId(sessionId);
      if (userId) {
        triggerWebhooks(userId, "session.disconnected", sessionId, {
          sessionId,
          reason: statusCode,
        }).catch(console.error);
      }

      if (shouldReconnect) {
        const retries = (retryCount.get(sessionId) ?? 0) + 1;

        if (retries > MAX_RETRIES) {
          console.log(`[${sessionId}] Max retries reached, giving up`);
          retryCount.delete(sessionId);
          await updateSessionStatus(sessionId, "disconnected");
          return;
        }

        retryCount.set(sessionId, retries);

        // ✅ exponential backoff: 3s, 6s, 12s
        const delay = 3000 * Math.pow(2, retries - 1);
        console.log(
          `[${sessionId}] Reconnecting in ${delay}ms (attempt ${retries}/${MAX_RETRIES})...`,
        );
        await updateSessionStatus(sessionId, "reconnecting");
        setTimeout(() => connectSession(sessionId), delay);
      } else {
        retryCount.delete(sessionId);
        await updateSessionStatus(sessionId, "disconnected", null);
        await clearCreds();
        console.log(`[${sessionId}] Logged out — creds cleared`);
      }
    }
  });

  // ── event: messages upsert ───────────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    // ambil userId sekali di awal
    const userId = await getSessionUserId(sessionId);
    if (!userId) return;

    const toSave = messages
      .filter((m) => m.message !== null && m.message !== undefined)
      .map((m) => ({
        sessionId,
        userId,
        remoteJid: m.key.remoteJid ?? "",
        fromMe: m.key.fromMe ?? false,
        messageId: m.key.id ?? null,
        type: Object.keys(m.message ?? {})[0] ?? "unknown",
        content:
          m.message?.conversation ??
          m.message?.extendedTextMessage?.text ??
          null,
        status: "received",
      }));

    if (toSave.length > 0) {
      await prisma.message.createMany({
        data: toSave,
        skipDuplicates: true,
      });
    }

    // proses setiap pesan setelah disimpan
    for (const m of messages) {
      const incomingText =
        m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? null;

      if (!incomingText) continue;

      // trigger webhook untuk pesan masuk
      if (!m.key.fromMe) {
        triggerWebhooks(userId, "message.received", sessionId, {
          from: m.key.remoteJid,
          message: incomingText,
          messageId: m.key.id,
        }).catch(console.error);
      }

      // auto reply hanya untuk pesan masuk
      if (m.key.fromMe) continue;

      const replyText = await processAutoReply(userId, sessionId, incomingText);

      if (replyText) {
        const jid = m.key.remoteJid!;
        await sock.sendMessage(jid, { text: replyText });

        // trigger webhook untuk pesan terkirim (auto reply)
        triggerWebhooks(userId, "message.sent", sessionId, {
          to: jid,
          message: replyText,
        }).catch(console.error);
      }
    }
  });
}

// ── disconnect ────────────────────────────────────────────────────────────
export async function disconnectSession(sessionId: string): Promise<void> {
  const sock = sessions.get(sessionId);
  if (!sock) return;

  await sock.logout();
  sessions.delete(sessionId);
  await updateSessionStatus(sessionId, "disconnected", null);
}

// ── restore semua session saat server start ───────────────────────────────
export async function restoreAllSessions(): Promise<void> {
  const activeSessions = await prisma.waSession.findMany({
    where: { status: { in: ["connected", "reconnecting"] } },
    select: { id: true },
  });

  console.log(`Restoring ${activeSessions.length} session(s)...`);

  for (const session of activeSessions) {
    await connectSession(session.id);
  }
}
