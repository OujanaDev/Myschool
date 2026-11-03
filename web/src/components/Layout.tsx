import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Search, Menu, X, Crown, LayoutDashboard, LogOut, Shield, User as UserIcon, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth";

/**
 * The Naja7School mark: a mortarboard with its tassel, a star, a pupil with open arms rising from an open book.
 * The ink parts take `currentColor` (teal on paper, white on the footer); the pages, tassel and star are apricot.
 * Same drawing as web/public/logo-mark.svg and favicon.svg: change them together.
 */
export function Mark({ className = "", light = false }: { className?: string; light?: boolean }) {
  const accent = light ? "#f7aa73" : "#ee8d51";
  return (
    <svg viewBox="0 0 120 100" className={className} fill="currentColor" aria-hidden="true">
      <path d="M60,92 C46,80 28,74 6,74 L10,84 C30,82 48,86 60,98 Z" />
      <path d="M60,92 C74,80 92,74 114,74 L110,84 C90,82 72,86 60,98 Z" />
      <path fill={accent} d="M60,84 C50,68 36,60 18,58 L22,68 C36,70 48,76 60,90 Z" />
      <path fill={accent} d="M60,84 C70,68 84,60 102,58 L98,68 C84,70 72,76 60,90 Z" />
      <path d="M60,84 C58,70 50,60 38,54 L41,49 C52,55 58,62 60,70 C62,62 68,55 79,49 L82,54 C70,60 62,70 60,84 Z" />
      <circle cx="60" cy="47" r="7" />
      <path d="M60,8 L94,21 L60,34 L26,21 Z" />
      <path d="M42,25 L42,33 C48,39 72,39 78,33 L78,25 Z" />
      <path d="M94,21 L94,35" stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle fill={accent} cx="94" cy="38" r="3.5" />
      <polygon fill={accent} points="84,33 85.76,37.57 90.66,37.84 86.85,40.93 88.11,45.66 84,43 79.89,45.66 81.15,40.93 77.34,37.84 82.24,37.57" />
    </svg>
  );
}

export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`} aria-label="Naja7School, accueil">
      <Mark className={`h-9 w-11 shrink-0 sm:h-10 sm:w-12 ${light ? "text-white" : "text-brand-600"}`} light={light} />
      <span className={`font-display text-[22px] font-bold tracking-[-0.02em] sm:text-[25px] ${light ? "text-white" : "text-ink"}`}>
        Naja<span className="text-accent-500">7</span>School
      </span>
    </Link>
  );
}

function NavItem({ to, children, end = false }: { to: string; children: React.ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-lg px-2.5 py-2 text-sm transition-colors hover:text-brand-600 ${isActive ? "font-bold text-brand-600" : "font-medium text-[#637171]"}`
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

  const links = (
    <>
      <NavItem to="/" end>Accueil</NavItem>
      <NavItem to="/explorer">Cours</NavItem>
      <Link to="/explorer#superieur" className="rounded-lg px-2.5 py-2 text-sm font-medium text-[#637171] transition-colors hover:text-brand-600">Concours</Link>
      <Link to="/#qcm" className="rounded-lg px-2.5 py-2 text-sm font-medium text-[#637171] transition-colors hover:text-brand-600">QCM</Link>
      {user && <NavItem to="/tableau-de-bord">Mon espace</NavItem>}
      {user && <NavItem to="/plan-etude">Plan d'étude</NavItem>}
      <NavItem to="/premium">Premium</NavItem>
      {isAdmin && <NavItem to="/admin">Admin</NavItem>}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-[78px] w-full max-w-[1280px] items-center gap-2 px-5 sm:px-9 md:gap-6">
          <Logo />
          <nav className="hidden items-center gap-3 lg:flex" aria-label="Navigation principale">
            {links}
          </nav>
          <form onSubmit={submitSearch} className="ml-auto hidden md:block" role="search">
            <label className="flex h-10 w-56 items-center gap-2 rounded-[9px] border border-[#dce5df] bg-white px-3 text-brand-600 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher un cours, un QCM, un niveau" type="search" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
            </label>
          </form>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                {!isPremium && (
                  <Link to="/premium" className="btn-accent !py-2">
                    <Crown className="h-4 w-4" /> Premium
                  </Link>
                )}
                <div className="group relative">
                  <button
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-brand-50"
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    aria-label={`Menu du compte de ${user.name}`}
                    onClick={() => setAccountOpen((v) => !v)}
                  >
                    <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate text-sm font-semibold">{user.name}</span>
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
                      <Link to="/tableau-de-bord" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-50">
                        <LayoutDashboard className="h-4 w-4" /> Tableau de bord
                      </Link>
                      <Link to="/profil" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-50">
                        <UserIcon className="h-4 w-4" /> Mon profil
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-50">
                          <Shield className="h-4 w-4" /> Administration
                        </Link>
                      )}
                      <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">
                        <LogOut className="h-4 w-4" /> Se déconnecter
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/connexion" className="px-2 text-sm font-semibold text-ink hover:text-brand-600">
                  Se connecter
                </Link>
                <Link to="/inscription" className="btn-primary !rounded-[9px] !px-4 !py-3 shadow-[0_5px_12px_rgba(11,125,118,0.15)]">
                  Commencer <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
          {!user && (
            <Link to="/inscription" className="btn-primary ml-auto !rounded-[9px] !px-3 !py-2.5 md:hidden">
              Commencer
            </Link>
          )}
          <button className="ml-auto rounded-lg p-2 hover:bg-brand-50 md:ml-0 lg:hidden [&:not(:first-child)]:ml-0" onClick={() => setOpen(!open)} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} aria-controls="mobile-menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <div id="mobile-menu" className="border-t border-line bg-paper px-5 py-4 lg:hidden">
            <form onSubmit={submitSearch} className="mb-3 md:hidden" role="search">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher" type="search" className="input" />
            </form>
            <div className="flex flex-col gap-1" onClick={() => setOpen(false)}>
              {links}
              {user ? (
                <>
                  <NavItem to="/profil">Mon profil</NavItem>
                  <button onClick={logout} className="rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-700">
                    Se déconnecter
                  </button>
                </>
              ) : (
                <div className="mt-2 flex gap-2 md:hidden">
                  <Link to="/connexion" className="btn-outline flex-1">Se connecter</Link>
                  <Link to="/inscription" className="btn-primary flex-1">Commencer</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main id="contenu" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <footer className="mt-16 bg-brand-900 text-[#bdd2ca]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-9">
          <Logo light />
          <p className="m-0">Apprendre aujourd'hui, réussir demain.</p>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Pied de page">
            <Link to="/explorer" className="hover:text-white">Cours</Link>
            <Link to="/premium" className="hover:text-white">Premium</Link>
            <Link to="/confidentialite" className="hover:text-white">Confidentialité</Link>
            <span className="text-[#83a29b]">© {new Date().getFullYear()} Naja7School</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
