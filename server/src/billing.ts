import { Router, raw, type Request } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { prisma, wrap, requireAuth, parse, publicUser } from "./lib.js";

/* Premium through Stripe Checkout: one-off payments that open Premium for a month or a year (no automatic
   renewal). The amounts live here only; the web reads them from GET /api/billing/plans. */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
export const stripeEnabled = !!STRIPE_SECRET_KEY;
const stripe = stripeEnabled ? new Stripe(STRIPE_SECRET_KEY) : null;

/** Launch offer: -50 % until this date (Morocco time), then the regular prices apply. */
export const PROMO_UNTIL = new Date("2026-12-30T23:59:59+01:00");
const promoActive = () => Date.now() <= PROMO_UNTIL.getTime();

export const PLANS = {
  monthly: { name: "Naja7School Premium — 1 mois", months: 1, regular: 199_00, promo: 99_00 },
  yearly: { name: "Naja7School Premium — 1 an", months: 12, regular: 1798_00, promo: 899_00 },
} as const;
type PlanId = keyof typeof PLANS;

export function currentPlans() {
  const promo = promoActive();
  return {
    currency: "MAD",
    promo: promo ? { percent: 50, until: PROMO_UNTIL.toISOString() } : null,
    stripe: stripeEnabled,
    plans: (Object.keys(PLANS) as PlanId[]).map((id) => ({
      id,
      name: PLANS[id].name,
      months: PLANS[id].months,
      amount: promo ? PLANS[id].promo : PLANS[id].regular,
      regular: PLANS[id].regular,
    })),
  };
}

/** Premium runs from today, or from the end of the current period when the user already has one. */
async function activate(userId: string, plan: PlanId, sessionId: string, amount: number, currency: string) {
  const existing = await prisma.payment.findUnique({ where: { id: sessionId } });
  if (existing) return prisma.user.findUnique({ where: { id: userId }, include: { level: { include: { cycle: true } } } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const from = user.premiumUntil && user.premiumUntil > new Date() ? new Date(user.premiumUntil) : new Date();
  from.setMonth(from.getMonth() + PLANS[plan].months);
  await prisma.payment.create({ data: { id: sessionId, userId, plan, amount, currency } });
  return prisma.user.update({
    where: { id: userId },
    data: { plan: "PREMIUM", premiumUntil: from },
    include: { level: { include: { cycle: true } } },
  });
}

/** Where Stripe sends the student back: the site that made the request, else the first allowed origin. */
function siteUrl(req: Request) {
  const origin = (req.headers.origin as string) || (req.headers.referer as string)?.replace(/(https?:\/\/[^/]+).*/, "$1");
  return process.env.APP_URL || origin || process.env.CORS_ORIGINS?.split(",")[0]?.trim() || "http://localhost:5173";
}

export const billingPublic = Router();
billingPublic.get("/plans", (_req, res) => res.json(currentPlans()));

/** Stripe calls this with a signed raw body; mounted before express.json. Confirms payments the browser never
    reported (tab closed on the success page). */
billingPublic.post(
  "/webhook",
  raw({ type: "application/json" }),
  wrap(async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: "Webhook non configuré" });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"] as string, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({ error: `Signature invalide : ${(err as Error).message}` });
    }
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const plan = s.metadata?.plan as PlanId | undefined;
      if (s.payment_status === "paid" && s.metadata?.userId && plan && PLANS[plan]) {
        await activate(s.metadata.userId, plan, s.id, s.amount_total ?? 0, s.currency ?? "mad");
      }
    }
    res.json({ received: true });
  })
);

export const billingPrivate = Router();
billingPrivate.use(requireAuth);

billingPrivate.post(
  "/checkout",
  wrap(async (req, res) => {
    if (!stripe) return res.status(503).json({ error: "Le paiement en ligne n'est pas encore disponible." });
    const { plan } = parse(z.object({ plan: z.enum(["monthly", "yearly"]) }), req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    const offer = currentPlans().plans.find((p) => p.id === plan)!;
    const site = siteUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { userId: user.id, plan },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "mad",
            unit_amount: offer.amount,
            product_data: {
              name: offer.name,
              // Required by Stripe Managed Payments: « General — Electronically Supplied Services »
              tax_code: "txcd_10000000",
              description: offer.amount < offer.regular ? `Offre de lancement -50 % (au lieu de ${offer.regular / 100} DH), valable jusqu'au 30/12/2026` : undefined,
            },
          },
        },
      ],
      success_url: `${site}/premium?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/premium?cancelled=1`,
      locale: "fr",
    });
    res.json({ url: session.url });
  })
);

/** The browser lands on /premium?session_id=… : the session is read from Stripe, and Premium opened if paid. */
billingPrivate.get(
  "/confirm",
  wrap(async (req, res) => {
    if (!stripe) return res.status(503).json({ error: "Le paiement en ligne n'est pas encore disponible." });
    const { session_id } = parse(z.object({ session_id: z.string().min(10) }), req.query);
    const s = await stripe.checkout.sessions.retrieve(session_id);
    if (s.metadata?.userId !== req.user!.id) return res.status(403).json({ error: "Cette session ne vous appartient pas" });
    if (s.payment_status !== "paid") return res.status(402).json({ error: "Le paiement n'a pas été confirmé" });
    const plan = s.metadata.plan as PlanId;
    const user = await activate(req.user!.id, plan, s.id, s.amount_total ?? 0, s.currency ?? "mad");
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(publicUser(user));
  })
);
