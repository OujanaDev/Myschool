import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import type { User } from "../lib/types";

const FREE = ["Tous les cours essentiels", "Séries d'exercices", "QCM de base avec correction", "Suivi de progression", "Recherche dans tout le catalogue"];
const PREMIUM = ["Tout le contenu gratuit", "Résumés et fiches de révision", "Examens blancs corrigés", "QCM avancés et tests chronométrés", "Plan d'étude personnalisé complet", "Accès sur web, Android et iOS"];

export default function PremiumPage() {
  const { user, isPremium, setUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const upgrade = async (plan: "monthly" | "yearly") => {
    if (!user) return navigate("/connexion", { state: { from: "/premium" } });
    setBusy(plan);
    setError("");
    try {
      setUser(await api.post<User>("/me/billing/upgrade", { plan }));
      navigate("/tableau-de-bord");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le paiement a échoué.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-2xl text-center">
        <span className="badge bg-accent-500/15 text-accent-600"><Crown className="h-3.5 w-3.5" /> Myschool Premium</span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink">Donnez-vous toutes les chances de réussir</h1>
        <p className="mt-3 text-muted">Le contenu essentiel reste gratuit. Premium ajoute tout ce qu'il faut pour viser l'excellence : résumés, examens corrigés et préparation personnalisée.</p>
        {isPremium && <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">Vous êtes membre Premium{user?.premiumUntil ? ` jusqu'au ${new Date(user.premiumUntil).toLocaleDateString("fr-MA")}` : ""}. Merci !</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
        <div className="card p-6">
          <h3 className="font-bold text-ink">Gratuit</h3>
          <div className="mt-2 text-3xl font-extrabold text-ink">0 DH</div>
          <p className="text-sm text-muted">Pour toujours</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {FREE.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" /> {f}</li>)}
          </ul>
        </div>
        <div className="card relative border-brand-500 p-6 ring-2 ring-brand-500/20">
          <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Le plus populaire</span>
          <h3 className="font-bold text-ink">Premium mensuel</h3>
          <div className="mt-2 text-3xl font-extrabold text-ink">49 DH<span className="text-base font-medium text-muted"> / mois</span></div>
          <p className="text-sm text-muted">Sans engagement</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {PREMIUM.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" /> {f}</li>)}
          </ul>
          <button className="btn-primary mt-6 w-full" disabled={!!busy || isPremium} onClick={() => upgrade("monthly")}>{busy === "monthly" ? "Activation…" : isPremium ? "Déjà actif" : "Choisir le mensuel"}</button>
        </div>
        <div className="card p-6">
          <h3 className="font-bold text-ink">Premium annuel</h3>
          <div className="mt-2 text-3xl font-extrabold text-ink">399 DH<span className="text-base font-medium text-muted"> / an</span></div>
          <p className="text-sm text-emerald-700">Économisez 189 DH</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {PREMIUM.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" /> {f}</li>)}
          </ul>
          <button className="btn-accent mt-6 w-full" disabled={!!busy || isPremium} onClick={() => upgrade("yearly")}>{busy === "yearly" ? "Activation…" : isPremium ? "Déjà actif" : "Choisir l'annuel"}</button>
        </div>
      </div>
      <p className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 text-center text-xs text-muted"><ShieldCheck className="h-4 w-4" /> Version de démonstration : l'activation est simulée. En production, le paiement passera par CMI, carte bancaire ou paiement mobile.</p>
    </div>
  );
}
