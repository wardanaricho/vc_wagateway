import type { JwtPayload } from "../utils/jwt.js";

declare module "express" {
  function express(): import("express-serve-static-core").Express;
  namespace express {
    function json(
      options?: import("body-parser").OptionsJson,
    ): import("express-serve-static-core").RequestHandler;
    function Router(
      options?: import("express-serve-static-core").RouterOptions,
    ): import("express-serve-static-core").Router;
    function urlencoded(
      options?: import("body-parser").OptionsUrlencoded,
    ): import("express-serve-static-core").RequestHandler;
    function static(
      root: string,
      options?: import("serve-static").ServeStaticOptions,
    ): import("express-serve-static-core").RequestHandler;
  }
  export = express;
}
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
