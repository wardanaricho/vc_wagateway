import { Router } from "express";
import {
  create,
  index,
  show,
  update,
  destroy,
} from "./auto-reply.controller.js";
import { authenticate } from "../auth/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", index); // GET    /api/auto-replies?sessionId=xxx
router.post("/", create); // POST   /api/auto-replies
router.get("/:id", show); // GET    /api/auto-replies/:id
router.patch("/:id", update); // PATCH  /api/auto-replies/:id
router.delete("/:id", destroy); // DELETE /api/auto-replies/:id

export { router as autoReplyRouter };
