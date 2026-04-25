/**
 * Delay random antara min dan max ms
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Tambahkan jitter (variasi kecil) ke delay agar lebih natural
 * Contoh: delay 2000ms ± 20% = antara 1600ms - 2400ms
 */
export function withJitter(baseMs: number, jitterPercent = 0.2): number {
  const jitter = baseMs * jitterPercent;
  return Math.floor(baseMs - jitter + Math.random() * jitter * 2);
}

/**
 * Format nomor telepon ke format JID WhatsApp
 * Input:  "08123456789" atau "+628123456789" atau "628123456789"
 * Output: "628123456789@s.whatsapp.net"
 */
export function toWhatsAppJid(phone: string): string {
  // hapus semua karakter non-digit
  let cleaned = phone.replace(/\D/g, "");

  // konversi 08xxx → 628xxx
  if (cleaned.startsWith("0")) {
    cleaned = `62${cleaned.slice(1)}`;
  }

  return `${cleaned}@s.whatsapp.net`;
}
