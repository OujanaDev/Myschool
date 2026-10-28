import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Search, Menu, X, Crown, LayoutDashboard, LogOut, Shield, User as UserIcon, Compass } from "lucide-react";
import { useAuth } from "../lib/auth";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        <svg viewBox="0 0 64 64" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 40V24l16-8 16 8v16" />
          <circle cx="32" cy="34" r="5" fill="#F59E0B" stroke="none" />
        </svg>
      </span>
      <span className="text-xl font-extrabold tracking-tight text-ink">
        My<span className="text-brand-600">school</span>
      </span>
    </Link>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-ink"}`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout, isPremium, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(q.trim())}`);
      setQ("");
      setOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="container-x flex h-16 items-center gap-4">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            <NavItem to="/explorer">Explorer</NavItem>
            {user && <NavItem to="/tableau-de-bord">Mon espace</NavItem>}
            {user && <NavItem to="/plan-etude">Plan d'étude</NavItem>}
            <NavItem to="/premium">Premium</NavItem>
            {isAdmin && <NavItem to="/admin">Admin</NavItem>}
          </nav>
          <form onSubmit={submitSearch} className="ml-auto hidden max-w-sm flex-1 md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un cours, un QCM, un niveau…" aria-label="Rechercher" type="search" className="input pl-9" />
            </div>
          </form>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                {!isPremium && (
                  <Link to="/premium" className="btn-accent !py-2">
                    <Crown className="h-4 w-4" /> Premium
                  </Link>
                )}
                <div className="group relative">
                  <button
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100"
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    aria-label={`Menu du compte de ${user.name}`}
                    onClick={() => setAccountOpen((v) => !v)}
                  >
                    <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate text-sm font-medium">{user.name}</span>
                  </button>
                  {/* Opens on hover, on click (touch) and while focus is inside (keyboard). */}
                  <div
                    className={`absolute right-0 top-full w-52 pt-2 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${accountOpen ? "visible opacity-100" : "invisible opacity-0"}`}
                    onClick={() => setAccountOpen(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setAccountOpen(false);
                        (e.currentTarget.previousElementSibling as HTMLElement | null)?.focus();
                      }
                    }}
                  >
                    <div className="card overflow-hidden p-1.5">
                      <Link to="/tableau-de-bord" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                        <LayoutDashboard className="h-4 w-4" /> Tableau de bord
                      </Link>
                      <Link to="/profil" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                        <UserIcon className="h-4 w-4" /> Mon profil
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                          <Shield className="h-4 w-4" /> Administration
                        </Link>
                      )}
                      <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" /> Se déconnecter
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/connexion" className="btn-ghost">
                  Se connecter
                </Link>
                <Link to="/inscription" className="btn-primary">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
          <button className="ml-auto rounded-lg p-2 hover:bg-slate-100 md:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} aria-controls="mobile-menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <div id="mobile-menu" className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <form onSubmit={submitSearch} className="mb-3">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher" type="search" className="input" />
            </form>
            <div className="flex flex-col gap-1" onClick={() => setOpen(false)}>
              <NavItem to="/explorer">
                <Compass className="mr-2 inline h-4 w-4" />
                Explorer
              </NavItem>
              {user && <NavItem to="/tableau-de-bord">Mon espace</NavItem>}
              {user && <NavItem to="/plan-etude">Plan d'étude</NavItem>}
              <NavItem to="/premium">Premium</NavItem>
              {isAdmin && <NavItem to="/admin">Administration</NavItem>}
              {user ? (
                <>
                  <NavItem to="/profil">Mon profil</NavItem>
                  <button onClick={logout} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600">
                    Se déconnecter
                  </button>
                </>
              ) : (
                <>
                  <NavItem to="/connexion">Se connecter</NavItem>
                  <NavItem to="/inscription">Créer un compte</NavItem>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main id="contenu" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="container-x flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted sm:flex-row">
          <Logo />
          <p>Plateforme éducative marocaine · Primaire, collège, lycée, concours.</p>
          <p>
            <Link to="/confidentialite" className="hover:text-ink hover:underline">
              Politique de confidentialité
            </Link>{" "}
            · © {new Date().getFullYear()} Myschool
          </p>
        </div>
      </footer>
    </div>
  );
}
