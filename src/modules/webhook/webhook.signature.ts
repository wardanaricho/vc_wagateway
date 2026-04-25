import { createHmac } from "crypto";

/**
 * Buat HMAC-SHA256 signature dari payload
 */
export function createSignature(secret: string, payload: string): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

/**
 * Verifikasi signature — untuk dipakai user di sisi mereka
 */
export function verifySignature(
  secret: string,
  payload: string,
  signature: string,
): boolean {
  const expected = createSignature(secret, payload);
  // timing-safe compare
  if (expected.length !== signature.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
