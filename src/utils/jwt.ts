import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET tidak di-set");

  return jwt.sign(payload, secret, {
    expiresIn: "15m",
    algorithm: "HS256",
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET tidak di-set");

  return jwt.sign(payload, secret, {
    expiresIn: "7d",
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET tidak di-set");

  return jwt.verify(token, secret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET tidak di-set");

  return jwt.verify(token, secret) as JwtPayload;
}
