import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { JWT_SECRET } from "./config";

export type Role = "ADMIN" | "PARTNER" | "ASSOCIATE";

export interface AuthPayload {
  sub: string; // id of the admin/partner/associate
  role: Role;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function requireAuth(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing bearer token" });
    }
    try {
      const token = header.slice("Bearer ".length);
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: "Forbidden for this role" });
      }
      req.auth = payload;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}
