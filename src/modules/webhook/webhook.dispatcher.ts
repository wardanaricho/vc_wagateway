import axios from "axios";
import { createSignature } from "./webhook.signature.js";
import type { WebhookPayload } from "./webhook.types.js";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000]; // ms

interface DispatchTarget {
  url: string;
  secret: string | null;
}

export async function dispatchWebhook(
  target: DispatchTarget,
  payload: WebhookPayload,
): Promise<void> {
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": payload.event,
    "X-Webhook-Timestamp": payload.timestamp,
  };

  if (target.secret) {
    headers["X-Webhook-Signature"] = createSignature(target.secret, body);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await axios.post(target.url, body, {
        headers,
        timeout: 5000, // 5 detik timeout per attempt
      });
      return; // sukses, keluar
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[Webhook] Attempt ${attempt + 1}/${MAX_RETRIES} failed for ${target.url}: ${lastError.message}`,
      );

      // jangan tunggu setelah attempt terakhir
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS[attempt]),
        );
      }
    }
  }

  console.error(
    `[Webhook] All ${MAX_RETRIES} attempts failed for ${target.url}: ${lastError?.message}`,
  );
}
