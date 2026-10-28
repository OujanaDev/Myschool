import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useFetch } from "../../lib/hooks";
import type { User } from "../../lib/types";
import { ErrorBox, PageHeader, Spinner, Stat } from "../../components/ui";

type Stats = {
  counts: { users: number; premium: number; levels: number; subjects: number; chapters: number; lessons: number; quizzes: number; questions: number; attempts: number };
  topLessons: { id: string; title: string; views: number; level: string; subject: string }[];
  recentUsers: User[];
};

export default function AdminDashboard() {
  const { data, loading, error, reload } = useFetch<Stats>("/admin/stats");
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? "Erreur"} retry={reload} />;
  const c = data.counts;
  return (
    <div>
      <PageHeader
        title="Administration"
        subtitle="Vue d'ensemble de la plateforme."
        actions={
          <>
            <Link to="/admin/cours/nouveau" className="btn-primary"><Plus className="h-4 w-4" /> Nouveau cours</Link>
            <Link to="/admin/qcm/nouveau" className="btn-outline"><Plus className="h-4 w-4" /> Nouveau QCM</Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Utilisateurs" value={c.users} hint={`${c.premium} premium`} />
        <Stat label="Niveaux" value={c.levels} hint={`${c.subjects} matières`} color="text-blue-600" />
        <Stat label="Cours & exercices" value={c.lessons} hint={`${c.chapters} chapitres`} color="text-violet-600" />
        <Stat label="QCM" value={c.quizzes} hint={`${c.questions} questions · ${c.attempts} tentatives`} color="text-amber-600" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-bold text-ink">Cours les plus consultés</h2>
          <ul className="divide-y divide-slate-100">
            {data.topLessons.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/cours/${l.id}`} className="truncate text-sm font-medium text-ink hover:text-brand-700">{l.title}</Link>
                  <div className="text-xs text-muted">{l.level} · {l.subject}</div>
                </div>
                <span className="text-sm font-semibold text-slate-600">{l.views} vues</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-bold text-ink">Derniers inscrits</h2>
          <ul className="divide-y divide-slate-100">
            {data.recentUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{u.name.charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{u.name}</div>
                  <div className="truncate text-xs text-muted">{u.email} · {u.level?.name ?? "sans niveau"}</div>
                </div>
                <span className={`badge ${u.plan === "PREMIUM" ? "bg-accent-500/15 text-accent-600" : "bg-slate-100 text-slate-600"}`}>{u.plan}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
