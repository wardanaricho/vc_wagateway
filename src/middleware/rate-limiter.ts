import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request } from "express";

// ── response standar saat kena limit ─────────────────────────────────────
const handler = (_req: Request, res: any) => {
  res.status(429).json({
    success: false,
    message: "Terlalu banyak request, coba lagi nanti",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Global — semua endpoint
//    100 request per 15 menit per IP
// ─────────────────────────────────────────────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler,
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Auth — login & register
//    10 request per 15 menit per IP (brute force protection)
// ─────────────────────────────────────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res: any) => {
    res.status(429).json({
      success: false,
      message: "Terlalu banyak percobaan login, coba lagi dalam 15 menit",
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Send message — per API key atau per IP
//    60 request per menit
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  // key berdasarkan API key jika ada, fallback ke IP
  keyGenerator: (req) => {
    const apiKey = req.headers["x-api-key"] as string | undefined;
    return apiKey ?? ipKeyGenerator(req.ip ?? "unknown");
  },
  handler: (_req, res: any) => {
    res.status(429).json({
      success: false,
      message: "Limit pengiriman pesan tercapai (60/menit), coba lagi nanti",
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. API umum — endpoint selain auth & send
//    300 request per 15 menit per IP
// ─────────────────────────────────────────────────────────────────────────────
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler,
});
