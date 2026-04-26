import type { JwtPayload } from "../utils/jwt.js";

// ✅ Fix express default import
declare module "express" {
  export default function express(): import("express").Application;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
