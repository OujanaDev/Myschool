import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const prisma = new PrismaClient();
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export type AuthUser = { id: string; role: string };
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: { id: string; role: string }) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
    } catch {
      /* ignore invalid token */
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Authentification requise" });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Authentification requise" });
  if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Accès administrateur requis" });
  next();
}

export async function isPremiumUser(userId?: string) {
  if (!userId) return false;
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return false;
  if (u.role === "ADMIN") return true;
  return u.plan === "PREMIUM" && (!u.premiumUntil || u.premiumUntil > new Date());
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const err: any = new Error(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "));
    err.status = 400;
    throw err;
  }
  return r.data;
}

export const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export function publicUser(u: any) {
  const { password, ...rest } = u;
  return rest;
}
