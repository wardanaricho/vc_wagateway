import { Router } from "express";
import {
  create,
  index,
  show,
  update,
  destroy,
} from "./wa-session.controller.js";
import { authenticate } from "../auth/auth.middleware.js";

const router = Router();

// semua route session butuh login
router.use(authenticate);

router.get("/", index); // GET    /api/sessions
router.post("/", create); // POST   /api/sessions
router.get("/:id", show); // GET    /api/sessions/:id
router.patch("/:id", update); // PATCH  /api/sessions/:id
router.delete("/:id", destroy); // DELETE /api/sessions/:id

export { router as waSessionRouter };
