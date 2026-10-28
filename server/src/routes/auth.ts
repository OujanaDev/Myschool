import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, signToken, parse, wrap, requireAuth, publicUser } from "../lib.js";

const r = Router();

r.post(
  "/register",
  wrap(async (req, res) => {
    const body = parse(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        levelId: z.string().optional(),
      }),
      req.body
    );
    const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: "Cet email est déjà utilisé" });
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        password: await bcrypt.hash(body.password, 10),
        levelId: body.levelId || null,
      },
      include: { level: { include: { cycle: true } } },
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

r.post(
  "/login",
  wrap(async (req, res) => {
    const body = parse(z.object({ email: z.string().email(), password: z.string() }), req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { level: { include: { cycle: true } } },
    });
    if (!user || !(await bcrypt.compare(body.password, user.password)))
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

r.get(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { level: { include: { cycle: true } } },
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(publicUser(user));
  })
);

r.patch(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const body = parse(
      z.object({ name: z.string().min(2).optional(), levelId: z.string().nullable().optional() }),
      req.body
    );
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: body,
      include: { level: { include: { cycle: true } } },
    });
    res.json(publicUser(user));
  })
);

export default r;
