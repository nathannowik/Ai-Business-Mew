import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface TokenPayload {
  userId: string;
  organizationId: string;
  role: string;
  isPlatformAdmin?: boolean;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}
