import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { prisma, signToken, parse, wrap, requireAuth, publicUser } from "../lib.js";

const r = Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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

/** Public settings the sign-in page needs: the Google client id (the button is hidden when it is not configured). */
r.get("/config", (_req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID || null });
});

/**
 * « Continuer avec Google » : the browser sends the ID token issued by Google Identity Services; it is verified here
 * (signature, audience), then the account is found by Google id, else linked by email, else created.
 */
r.post(
  "/google",
  wrap(async (req, res) => {
    if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: "La connexion Google n'est pas configurée" });
    const body = parse(z.object({ credential: z.string().min(20), levelId: z.string().optional() }), req.body);
    let payload: TokenPayload | undefined;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: body.credential, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: "Connexion Google refusée" });
    }
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({ error: "Adresse Google non vérifiée" });
    }
    const email = payload.email.toLowerCase();
    const include = { level: { include: { cycle: true } } };
    let user = await prisma.user.findUnique({ where: { googleId: payload.sub }, include });
    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      user = byEmail
        ? await prisma.user.update({ where: { id: byEmail.id }, data: { googleId: payload.sub }, include })
        : await prisma.user.create({
            data: {
              name: payload.name || email.split("@")[0],
              email,
              googleId: payload.sub,
              // No password of their own: Google is the only way in until one is set from the profile.
              password: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
              levelId: body.levelId || null,
            },
            include,
          });
    }
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
