import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../../utils/jwt.js";
import { validateApiKey } from "./api-key.service.js";

export async function authenticateAny(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  // ── coba JWT dulu ──────────────────────────────────────────────────────
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      req.user = verifyAccessToken(token);
      return next();
    } catch {
      // bukan JWT valid, coba API key
    }
  }

  // ── coba API Key ───────────────────────────────────────────────────────
  const apiKey =
    (req.headers["x-api-key"] as string) ?? (req.query["api_key"] as string);

  if (apiKey) {
    const user = await validateApiKey(apiKey);
    if (user) {
      req.user = { sub: user.id, email: user.email, role: user.role };
      return next();
    }
  }

  res.status(401).json({ success: false, message: "Unauthorized" });
}
