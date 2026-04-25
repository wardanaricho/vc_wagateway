import { Router } from "express";
import { create, index, show, update, destroy } from "./webhook.controller.js";
import { authenticate } from "../auth/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", index);
router.post("/", create);
router.get("/:id", show);
router.patch("/:id", update);
router.delete("/:id", destroy);

export { router as webhookRouter };
