import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useFetch } from "../lib/hooks";
import type { Cycle, User } from "../lib/types";
import { Logo } from "../components/Layout";
import { GoogleButton } from "../components/GoogleButton";

/* For now the only way in is Google. The email + password form stays reachable behind a discreet link, for the
   admin and demo accounts, which have no Google account. */

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

const ErrorLine = ({ error }: { error: string }) =>
  error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null;

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [withPassword, setWithPassword] = useState(false);

  const afterLogin = (u: User) => navigate((location.state as any)?.from || (u.role === "ADMIN" ? "/admin" : "/tableau-de-bord"));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      afterLogin(await login(email, password));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Bon retour !" subtitle={<>Pas encore de compte ? <Link to="/inscription" className="font-semibold text-brand-700">Créer un compte</Link></>}>
      <GoogleButton text="signin_with" standalone onCredential={async (c) => afterLogin(await loginWithGoogle(c))} onError={setError} />
      <p className="mt-4 text-center text-xs text-muted">Connexion en un clic avec votre compte Google, sans mot de passe à retenir.</p>
      <ErrorLine error={error} />

      {withPassword ? (
        <form onSubmit={submit} className="mt-6 space-y-4 border-t border-slate-200 pt-6">
          <div>
            <label className="label" htmlFor="auth-48">Email</label>
            <input id="auth-48" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ma" />
          </div>
          <div>
            <label className="label" htmlFor="auth-52">Mot de passe</label>
            <input id="auth-52" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      ) : (
        <p className="mt-8 text-center text-xs text-muted">
          Compte administrateur ?{" "}
          <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => setWithPassword(true)}>
            Se connecter avec un mot de passe
          </button>
        </p>
      )}
    </Shell>
  );
}

export function Register() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { data: cycles } = useFetch<Cycle[]>("/cycles");
  const [levelId, setLevelId] = useState("");
  const [error, setError] = useState("");

  return (
    <Shell title="Créer un compte" subtitle={<>Déjà inscrit ? <Link to="/connexion" className="font-semibold text-brand-700">Se connecter</Link></>}>
      <div className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="auth-108">Votre niveau</label>
          <select id="auth-108" className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
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
        <GoogleButton
          text="signup_with"
          standalone
          onCredential={async (c) => {
            await loginWithGoogle(c, levelId || undefined);
            navigate("/tableau-de-bord");
          }}
          onError={setError}
        />
        <ErrorLine error={error} />
        <p className="text-center text-xs text-muted">
          Inscription gratuite en un clic avec votre compte Google. En créant un compte, vous acceptez notre{" "}
          <Link to="/confidentialite" className="font-semibold text-brand-700 hover:underline">
            politique de confidentialité
          </Link>
          . Si vous avez moins de 18 ans, demandez d'abord l'accord de vos parents.
        </p>
      </div>
    </Shell>
  );
}
