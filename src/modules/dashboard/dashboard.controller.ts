import type { Request, Response } from "express";
import {
  getOverview,
  getSessionsStats,
  getMessageStats,
  getRecentActivity,
} from "./dashboard.service.js";

export async function overview(req: Request, res: Response) {
  const userId = req.user!.sub;

  try {
    const data = await getOverview(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil overview";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function sessions(req: Request, res: Response) {
  const userId = req.user!.sub;

  try {
    const data = await getSessionsStats(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Gagal mengambil stats session";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function messages(req: Request, res: Response) {
  const userId = req.user!.sub;

  try {
    const data = await getMessageStats(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Gagal mengambil stats pesan";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function activity(req: Request, res: Response) {
  const userId = req.user!.sub;

  try {
    const data = await getRecentActivity(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Gagal mengambil aktivitas";
    res.status(500).json({ success: false, message: msg });
  }
}
