import { Router } from "express";
import {
  overview,
  sessions,
  messages,
  activity,
} from "./dashboard.controller.js";
import { authenticate } from "../auth/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/overview", overview); // GET /api/dashboard/overview
router.get("/sessions", sessions); // GET /api/dashboard/sessions
router.get("/messages", messages); // GET /api/dashboard/messages
router.get("/activity", activity); // GET /api/dashboard/activity

export { router as dashboardRouter };
