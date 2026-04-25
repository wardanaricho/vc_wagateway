import type { Request, Response } from "express";
import type { LoginBody, RefreshBody, RegisterBody } from "./auth.types.js";
import { loginUser, refreshTokens, registerUser } from "./auth.service.js";

export async function register(req: Request, res: Response) {
  const body = req.body as RegisterBody;

  if (!body.email || !body.username || !body.password || !body.name) {
    res.status(400).json({
      success: false,
      message: "name, email, username, dan password wajib diisi",
    });
    return;
  }

  try {
    const user = await registerUser(body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registrasi gagal";
    res.status(409).json({ success: false, message: msg });
  }
}

export async function login(req: Request, res: Response) {
  const body = req.body as LoginBody;

  if (!body.email || !body.password) {
    res.status(400).json({
      success: false,
      message: "email dan password wajib diisi",
    });
    return;
  }

  try {
    const result = await loginUser(body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Login gagal";
    res.status(401).json({ success: false, message: msg });
  }
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as RefreshBody;

  if (!refreshToken) {
    res.status(400).json({
      success: false,
      message: "refreshToken wajib diisi",
    });
    return;
  }

  try {
    const tokens = await refreshTokens(refreshToken);
    res.status(200).json({ success: true, data: tokens });
  } catch {
    res.status(401).json({
      success: false,
      message: "Refresh token tidak valid atau sudah expired",
    });
  }
}

export async function me(req: Request, res: Response) {
  res.status(200).json({ success: true, data: req.user });
}
