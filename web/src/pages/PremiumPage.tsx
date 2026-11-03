import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Crown, ShieldCheck, Sparkles, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { useFetch } from "../lib/hooks";
import type { BillingPlans, User } from "../lib/types";

/* Three offers: limited free access, and two paid plans opened through Stripe Checkout (one-off payment for a
   month or a year, no automatic renewal). The prices and the launch offer come from the API (one source of truth
   for what Stripe charges). */

export const FREE = ["Le premier cours de chaque chapitre, avec son résumé", "QCM avec correction", "Suivi de progression", "Recherche dans tout le catalogue"];
export const FREE_NOT = ["Les autres cours et résumés du chapitre", "Séries d'exercices corrigés", "Examens blancs corrigés", "Plan d'étude personnalisé"];
export const PREMIUM = [
  "Tous les cours de chaque chapitre",
  "Résumés et fiches de révision",
  "Séries d'exercices corrigés",
  "QCM de 20 questions avec correction",
  "Examens blancs corrigés",
  "Plan d'étude personnalisé complet",
  "Accès sur web, Android et iOS",
];

export const dh = (centimes: number) => (centimes / 100).toLocaleString("fr-MA", { maximumFractionDigits: 0 }).replace(/ /g, " ");
export const promoEnd = (iso: string) => new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function PremiumPage() {
  const { user, isPremium, setUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: billing } = useFetch<BillingPlans>("/billing/plans");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(params.get("cancelled") ? "Paiement annulé. Vous pouvez réessayer quand vous voulez." : "");
  const [done, setDone] = useState(false);
  const confirming = useRef(false);

  // Back from Stripe: confirm the session once, then clean the address.
  const sessionId = params.get("session_id");
  useEffect(() => {
    if (!sessionId || !user || confirming.current) return;
    confirming.current = true;
    setBusy("confirm");
    api
      .get<User>(`/billing/confirm?session_id=${encodeURIComponent(sessionId)}`)
      .then((u) => {
        setUser(u);
        setDone(true);
        // Paid: straight to the courses, where everything is now open.
        navigate("/explorer", { replace: true, state: { premiumJustActivated: true } });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Le paiement n'a pas pu être confirmé."))
      .finally(() => {
        setBusy(null);
        setParams({}, { replace: true });
      });
  }, [sessionId, user, setUser, setParams]);

  const checkout = async (plan: "monthly" | "yearly") => {
    if (!user) return navigate("/connexion", { state: { from: "/premium" } });
    setBusy(plan);
    setError("");
    try {
      const { url } = await api.post<{ url: string }>("/billing/checkout", { plan });
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le paiement a échoué.");
      setBusy(null);
    }
  };

  const monthly = billing?.plans.find((p) => p.id === "monthly");
  const yearly = billing?.plans.find((p) => p.id === "yearly");
  const promo = billing?.promo;

  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-2xl text-center">
        <span className="badge bg-accent-500/15 text-accent-600"><Crown className="h-3.5 w-3.5" /> Naja7School Premium</span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink">Donnez-vous toutes les chances de réussir</h1>
        <p className="mt-3 text-muted">L'accès gratuit permet de découvrir chaque chapitre. Premium ouvre tout : cours complets, résumés, exercices corrigés, QCM complets et examens blancs.</p>
        {promo && (
          <p className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-accent-500/40 bg-accent-500/10 px-4 py-2 text-sm font-semibold text-accent-700">
            <Sparkles className="h-4 w-4" /> Offre de lancement : -{promo.percent} % sur Premium jusqu'au {promoEnd(promo.until)}
          </p>
        )}
        {done && <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">Paiement confirmé. Bienvenue dans Premium !</p>}
        {isPremium && !done && <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">Vous êtes membre Premium{user?.premiumUntil ? ` jusqu'au ${new Date(user.premiumUntil).toLocaleDateString("fr-MA")}` : ""}. Merci !</p>}
        {busy === "confirm" && <p className="mt-4 text-sm text-muted">Confirmation du paiement…</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
        <div className="card p-6">
          <h3 className="font-bold text-ink">Gratuit</h3>
          <div className="mt-2 text-3xl font-extrabold text-ink">0 DH</div>
          <p className="text-sm text-muted">Accès limité, pour toujours</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {FREE.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" /> {f}</li>)}
            {FREE_NOT.map((f) => <li key={f} className="flex gap-2 text-muted"><X className="h-4 w-4 shrink-0 text-slate-400" /> {f}</li>)}
          </ul>
        </div>

        <div className="card relative border-brand-500 p-6 ring-2 ring-brand-500/20">
          <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Le plus populaire</span>
          <h3 className="font-bold text-ink">Premium mensuel</h3>
          <Price plan={monthly} unit="mois" />
          <p className="text-sm text-muted">Accès complet pendant 1 mois, sans engagement</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {PREMIUM.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" /> {f}</li>)}
          </ul>
          <button className="btn-primary mt-6 w-full" disabled={!!busy || !monthly} onClick={() => checkout("monthly")}>
            {busy === "monthly" ? "Redirection vers le paiement…" : isPremium ? "Prolonger d'un mois" : "Choisir le mensuel"}
          </button>
        </div>

        <div className="card relative p-6">
          {promo && <span className="absolute -top-3 left-6 rounded-full bg-accent-600 px-3 py-1 text-xs font-bold text-white">Meilleure offre</span>}
          <h3 className="font-bold text-ink">Premium annuel</h3>
          <Price plan={yearly} unit="an" />
          {monthly && yearly && (
            <p className="text-sm text-emerald-700">Économisez {dh(monthly.amount * 12 - yearly.amount)} DH par rapport au mensuel</p>
          )}
          <ul className="mt-6 space-y-2.5 text-sm">
            {PREMIUM.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" /> {f}</li>)}
          </ul>
          <button className="btn-accent mt-6 w-full" disabled={!!busy || !yearly} onClick={() => checkout("yearly")}>
            {busy === "yearly" ? "Redirection vers le paiement…" : isPremium ? "Prolonger d'un an" : "Choisir l'annuel"}
          </button>
        </div>
      </div>

      <p className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 text-center text-xs text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0" /> Paiement sécurisé par carte bancaire via Stripe. Aucun renouvellement automatique : vous rechoisissez une offre à la fin de la période.
      </p>
    </div>
  );
}

function Price({ plan, unit }: { plan?: BillingPlans["plans"][number]; unit: string }) {
  if (!plan) return <div className="mt-2 h-9 w-32 animate-pulse rounded bg-slate-100" />;
  const discounted = plan.amount < plan.regular;
  return (
    <div className="mt-2">
      {discounted && <div className="text-sm font-medium text-muted line-through">{dh(plan.regular)} DH</div>}
      <div className="text-3xl font-extrabold text-ink">
        {dh(plan.amount)} DH<span className="text-base font-medium text-muted"> / {unit}</span>
      </div>
    </div>
  );
}
