import "dotenv/config";
import cors from "cors";

import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { authRouter } from "./modules/auth/auth.routes.js";
import { waSessionRouter } from "./modules/wa-session/wa-session.route.js";
import { apiKeyRouter } from "./modules/api-key/api-key.routes.js";
import { restoreAllSessions } from "./modules/baileys/baileys.manager.js";
import { baileysRouter } from "./modules/baileys/baileys.route.js";
import { autoReplyRouter } from "./modules/auto-reply/auto-reply.routes.js";
import { webhookRouter } from "./modules/webhook/webhook.routes.js";
import { apiLimiter, globalLimiter } from "./middleware/rate-limiter.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);

const PORT = process.env.PORT ?? 3000;

// global middleware
app.use(express.json());

// rate limiter
app.use(globalLimiter);

// routes
app.use("/api/auth", authRouter);
app.use("/api/sessions", waSessionRouter);
app.use("/api/keys", apiKeyRouter);
app.use("/api/sessions", baileysRouter);
app.use("/api/auto-replies", autoReplyRouter);
app.use("/api/webhooks", webhookRouter);
app.use("/api/dashboard", apiLimiter, dashboardRouter);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route tidak ditemukan" });
});

// global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  restoreAllSessions().catch(console.error);
});
