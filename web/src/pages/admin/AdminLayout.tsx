import { Link, NavLink, Outlet } from "react-router-dom";
import { BookOpen, ClipboardList, ExternalLink, Layers, LayoutDashboard, LogOut, Palette, Users } from "lucide-react";
import { Logo } from "../../components/Layout";
import { useAuth } from "../../lib/auth";

const NAV = [
  { to: "/admin", label: "Tableau de bord", Icon: LayoutDashboard, end: true },
  { to: "/admin/niveaux", label: "Cycles & niveaux", Icon: Layers },
  { to: "/admin/matieres", label: "Matières", Icon: Palette },
  { to: "/admin/cours", label: "Cours & exercices", Icon: BookOpen },
  { to: "/admin/qcm", label: "QCM", Icon: ClipboardList },
  { to: "/admin/utilisateurs", label: "Utilisateurs", Icon: Users },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <Logo />
          <span className="ml-2 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
              <n.Icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"><ExternalLink className="h-4 w-4" /> Voir le site</Link>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Déconnexion</button>
          <div className="mt-2 truncate px-3 text-xs text-muted">{user?.email}</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 overflow-x-auto border-b border-slate-200 bg-white px-4 lg:hidden">
          <Logo />
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium ${isActive ? "bg-brand-600 text-white" : "text-slate-700"}`}>{n.label}</NavLink>
          ))}
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
