import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../../utils/jwt.js";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Token tidak ditemukan" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Token tidak valid atau sudah expired",
    });
  }
}

// Role-based guard, pakai setelah authenticate
// Contoh: authorize("admin")
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: "Akses ditolak" });
      return;
    }
    next();
  };
}
