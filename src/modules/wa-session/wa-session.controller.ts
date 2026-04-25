import type { Request, Response } from "express";
import {
  createSession,
  getSessionsByUser,
  getSessionById,
  updateSession,
  deleteSession,
} from "./wa-session.service.js";
import type {
  CreateSessionBody,
  UpdateSessionBody,
} from "./wa-session.types.js";

export async function create(req: Request, res: Response) {
  const body = req.body as CreateSessionBody;
  const userId = req.user!.sub;

  if (!body.name) {
    res.status(400).json({ success: false, message: "name wajib diisi" });
    return;
  }

  try {
    const session = await createSession(userId, body);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membuat session";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function index(req: Request, res: Response) {
  const userId = req.user!.sub;

  try {
    const sessions = await getSessionsByUser(userId);
    res.status(200).json({ success: true, data: sessions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil sessions";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function show(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;

  try {
    const session = await getSessionById(id!, userId);
    res.status(200).json({ success: true, data: session });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil session";
    res.status(404).json({ success: false, message: msg });
  }
}

export async function update(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;
  const body = req.body as UpdateSessionBody;

  try {
    const session = await updateSession(id!, userId, body);
    res.status(200).json({ success: true, data: session });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal update session";
    res.status(404).json({ success: false, message: msg });
  }
}

export async function destroy(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;

  try {
    await deleteSession(id!, userId);
    res
      .status(200)
      .json({ success: true, message: "Session berhasil dihapus" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus session";
    res.status(404).json({ success: false, message: msg });
  }
}
