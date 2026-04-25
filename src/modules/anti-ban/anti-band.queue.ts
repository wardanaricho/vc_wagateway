import type { WASocket } from "baileys";
import { randomDelay } from "./anti-ban.utils.js";
import { incrementCounter, getCount } from "./anti-ban.counter.js";
import { DEFAULT_ANTI_BAN_CONFIG } from "./anti-ban.config.js";

interface QueueItem {
  jid: string;
  message: string;
  resolve: (messageId: string | undefined) => void;
  reject: (err: Error) => void;
}

// antrian per session
const queues = new Map<string, QueueItem[]>();
const processing = new Map<string, boolean>();

function getQueue(sessionId: string): QueueItem[] {
  if (!queues.has(sessionId)) {
    queues.set(sessionId, []);
  }
  return queues.get(sessionId)!;
}

async function processQueue(sessionId: string, sock: WASocket): Promise<void> {
  // sudah sedang diproses
  if (processing.get(sessionId)) return;
  processing.set(sessionId, true);

  const queue = getQueue(sessionId);
  const config = DEFAULT_ANTI_BAN_CONFIG;

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    // cek limit per jam dan per hari
    const { hour, day } = getCount(sessionId);

    if (hour >= config.maxMessagesPerHour) {
      item.reject(
        new Error(
          `Limit pesan per jam tercapai (${config.maxMessagesPerHour}/jam)`,
        ),
      );
      continue;
    }

    if (day >= config.maxMessagesPerDay) {
      item.reject(
        new Error(
          `Limit pesan per hari tercapai (${config.maxMessagesPerDay}/hari)`,
        ),
      );
      continue;
    }

    try {
      const result = await sock.sendMessage(item.jid, { text: item.message });
      incrementCounter(sessionId);
      item.resolve(result?.key.id ?? undefined);
    } catch (err) {
      item.reject(err instanceof Error ? err : new Error(String(err)));
    }

    // delay random sebelum pesan berikutnya
    if (queue.length > 0) {
      await randomDelay(config.minDelayMs, config.maxDelayMs);
    }
  }

  processing.set(sessionId, false);
}

/**
 * Tambahkan pesan ke antrian session.
 * Return messageId setelah pesan berhasil dikirim.
 */
export function enqueueMessage(
  sessionId: string,
  sock: WASocket,
  jid: string,
  message: string,
): Promise<string | undefined> {
  const config = DEFAULT_ANTI_BAN_CONFIG;
  const queue = getQueue(sessionId);

  // cek ukuran antrian
  if (queue.length >= config.maxBurstMessages * 10) {
    return Promise.reject(new Error("Antrian pesan penuh, coba lagi nanti"));
  }

  return new Promise((resolve, reject) => {
    queue.push({ jid, message, resolve, reject });
    // trigger processing (tidak perlu await)
    processQueue(sessionId, sock).catch(console.error);
  });
}

export function getQueueLength(sessionId: string): number {
  return getQueue(sessionId).length;
}

export function clearQueue(sessionId: string): void {
  queues.delete(sessionId);
  processing.delete(sessionId);
}
