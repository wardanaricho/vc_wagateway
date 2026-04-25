import type { Request, Response } from "express";
import {
  createAutoReply,
  getAutoRepliesByUser,
  getAutoReplyById,
  updateAutoReply,
  deleteAutoReply,
} from "./auto-reply.service.js";
import type {
  CreateAutoReplyBody,
  UpdateAutoReplyBody,
} from "./auto-reply.types.js";

const VALID_MATCH_TYPES = [
  "contains",
  "exact",
  "startsWith",
  "endsWith",
  "regex",
];

export async function create(req: Request, res: Response) {
  const userId = req.user!.sub;
  const body = req.body as CreateAutoReplyBody;

  if (!body.keyword || !body.response || !body.matchType) {
    res.status(400).json({
      success: false,
      message: "keyword, matchType, dan response wajib diisi",
    });
    return;
  }

  if (!VALID_MATCH_TYPES.includes(body.matchType)) {
    res.status(400).json({
      success: false,
      message: `matchType harus salah satu dari: ${VALID_MATCH_TYPES.join(", ")}`,
    });
    return;
  }

  try {
    const data = await createAutoReply(userId, body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membuat auto reply";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function index(req: Request, res: Response) {
  const userId = req.user!.sub;
  const sessionId = req.query["sessionId"] as string | undefined;

  try {
    const data = await getAutoRepliesByUser(userId, sessionId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Gagal mengambil auto replies";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function show(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;

  try {
    const data = await getAutoReplyById(id, userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Gagal mengambil auto reply";
    res.status(404).json({ success: false, message: msg });
  }
}

export async function update(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;
  const body = req.body as UpdateAutoReplyBody;

  if (body.matchType && !VALID_MATCH_TYPES.includes(body.matchType)) {
    res.status(400).json({
      success: false,
      message: `matchType harus salah satu dari: ${VALID_MATCH_TYPES.join(", ")}`,
    });
    return;
  }

  try {
    const data = await updateAutoReply(id, userId, body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal update auto reply";
    res.status(404).json({ success: false, message: msg });
  }
}

export async function destroy(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;

  try {
    await deleteAutoReply(id, userId);
    res
      .status(200)
      .json({ success: true, message: "Auto reply berhasil dihapus" });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Gagal menghapus auto reply";
    res.status(404).json({ success: false, message: msg });
  }
}
