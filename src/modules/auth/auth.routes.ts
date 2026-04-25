import { Router } from "express";
import { login, me, refresh, register } from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.get("/me", authenticate, me); // protected

export { router as authRouter };
