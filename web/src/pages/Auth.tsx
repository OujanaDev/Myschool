import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useFetch } from "../lib/hooks";
import type { Cycle } from "../lib/types";
import { Logo } from "../components/Layout";

function Shell({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md p-8 fade-up">
        <Logo className="justify-center" />
        <h1 className="mt-6 text-center text-2xl font-extrabold text-ink">{title}</h1>
        <p className="mt-1 text-center text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(email, password);
      navigate((location.state as any)?.from || (u.role === "ADMIN" ? "/admin" : "/tableau-de-bord"));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Bon retour !" subtitle={<>Pas encore de compte ? <Link to="/inscription" className="font-semibold text-brand-700">Créer un compte</Link></>}>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="auth-48">Email</label>
          <input id="auth-48" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ma" />
        </div>
        <div>
          <label className="label" htmlFor="auth-52">Mot de passe</label>
          <input id="auth-52" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">Comptes de démonstration</p>
        <p className="mt-1">Élève : eleve@myschool.ma / Eleve1234!</p>
        <p>Premium : premium@myschool.ma / Premium1234!</p>
        <p>Admin : admin@myschool.ma / Admin1234!</p>
      </div>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { data: cycles } = useFetch<Cycle[]>("/cycles");
  const [form, setForm] = useState({ name: "", email: "", password: "", levelId: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register({ ...form, levelId: form.levelId || undefined });
      navigate("/tableau-de-bord");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Créer un compte" subtitle={<>Déjà inscrit ? <Link to="/connexion" className="font-semibold text-brand-700">Se connecter</Link></>}>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="auth-96">Nom complet</label>
          <input id="auth-96" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Prénom Nom" />
        </div>
        <div>
          <label className="label" htmlFor="auth-100">Email</label>
          <input id="auth-100" className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="auth-104">Mot de passe (6 caractères min.)</label>
          <input id="auth-104" className="input" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="auth-108">Votre niveau</label>
          <select id="auth-108" className="input" value={form.levelId} onChange={(e) => setForm({ ...form, levelId: e.target.value })}>
            <option value="">Choisir plus tard</option>
            {(cycles ?? []).map((c) => (
              <optgroup key={c.id} label={c.name}>
                {c.levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Création…" : "Créer mon compte gratuit"}
        </button>
        <p className="text-center text-xs text-muted">
          En créant un compte, vous acceptez notre{" "}
          <Link to="/confidentialite" className="font-semibold text-brand-700 hover:underline">
            politique de confidentialité
          </Link>
          . Si vous avez moins de 18 ans, demandez d'abord l'accord de vos parents.
        </p>
      </form>
    </Shell>
  );
}
