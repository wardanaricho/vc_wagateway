import type { Request, Response } from "express";
import {
  createApiKey,
  getApiKeysByUser,
  revokeApiKey,
  deleteApiKey,
} from "./api-key.service.js";
import type { CreateApiKeyBody, UpdateApiKeyBody } from "./api-key.types.js";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export async function create(req: Request, res: Response) {
  const userId = req.user!.sub;
  const body = req.body as CreateApiKeyBody;

  if (!body.name) {
    res.status(400).json({ success: false, message: "name wajib diisi" });
    return;
  }

  try {
    const data = await createApiKey(userId, body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membuat API key";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function index(req: Request, res: Response) {
  const userId = req.user!.sub;

  try {
    const data = await getApiKeysByUser(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil API keys";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function revoke(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;

  try {
    const data = await revokeApiKey(id, userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal merevoke API key";
    res.status(404).json({ success: false, message: msg });
  }
}

export async function destroy(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;

  try {
    await deleteApiKey(id, userId);
    res
      .status(200)
      .json({ success: true, message: "API key berhasil dihapus" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus API key";
    res.status(404).json({ success: false, message: msg });
  }
}
