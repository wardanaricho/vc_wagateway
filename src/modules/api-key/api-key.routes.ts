import { Router } from "express";
import { create, index, revoke, destroy } from "./api-key.controller.js";
import { authenticate } from "../auth/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", index);
router.post("/", create);
router.patch("/:id/revoke", revoke);
router.delete("/:id", destroy);

export { router as apiKeyRouter };
