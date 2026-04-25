import { Router } from "express";
import {
  connect,
  disconnect,
  getQr,
  getStatus,
  sendMessage,
  getMessages,
} from "./baileys.controller.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authenticateAny } from "../api-key/api-key.middleware.js";
import { sendMessageLimiter } from "../../middleware/rate-limiter.js";

const router = Router();

router.get("/:id/status", authenticate, getStatus);
router.get("/:id/qr", authenticate, getQr);
router.get("/:id/messages", authenticate, getMessages);
router.post("/:id/connect", authenticate, connect);
router.post("/:id/disconnect", authenticate, disconnect);
router.post("/:id/send", sendMessageLimiter, authenticateAny, sendMessage);

export { router as baileysRouter };
