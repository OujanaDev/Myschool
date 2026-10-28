import { Link } from "react-router-dom";
import { ArrowRight, Crown, Target, TrendingUp } from "lucide-react";
import { useFetch } from "../lib/hooks";
import type { Dashboard as DashboardData } from "../lib/types";
import { ErrorBox, PremiumBadge, ProgressBar, Spinner, Stat, SubjectIcon, TypeBadge } from "../components/ui";
import { useAuth } from "../lib/auth";

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch<DashboardData>("/me/dashboard");
  const { isPremium } = useAuth();
  if (loading) return <Spinner />;
  if (error || !data) return <div className="container-x py-10"><ErrorBox message={error ?? "Erreur"} retry={reload} /></div>;

  const { user, stats, levelProgress, performance, recentAttempts, recommendations, activity } = data;
  const maxAct = Math.max(1, ...activity.map((a) => a.lessons + a.quizzes));
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="container-x py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Bonjour, {user.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-muted">
            {user.level ? (
              <>Niveau : <Link to={`/niveau/${user.level.slug}`} className="font-semibold text-brand-700">{user.level.name}</Link></>
            ) : (
              <>Vous n'avez pas encore choisi de niveau. <Link to="/profil" className="font-semibold text-brand-700">Choisir mon niveau</Link></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPremium ? <PremiumBadge /> : <Link to="/premium" className="btn-accent"><Crown className="h-4 w-4" /> Passer à Premium</Link>}
          <Link to="/plan-etude" className="btn-primary"><Target className="h-4 w-4" /> Mon plan d'étude</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cours terminés" value={stats.completedLessons} />
        <Stat label="QCM réalisés" value={stats.quizAttempts} color="text-amber-600" />
        <Stat label="Score moyen" value={`${stats.averageScore}%`} color={stats.averageScore >= 70 ? "text-emerald-600" : "text-slate-700"} />
        <Stat label="Favoris" value={stats.bookmarks} color="text-violet-600" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {user.level && (
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-ink">Progression dans {user.level.shortName || user.level.name}</h2>
                <span className="text-sm text-muted">{levelProgress.completed}/{levelProgress.total} contenus</span>
              </div>
              <ProgressBar value={levelProgress.total ? (levelProgress.completed / levelProgress.total) * 100 : 0} className="mt-3" />
            </div>
          )}

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-ink">Recommandé pour vous</h2>
              {user.level && <Link to={`/niveau/${user.level.slug}`} className="text-sm font-semibold text-brand-700">Voir tout</Link>}
            </div>
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted">Choisissez votre niveau pour recevoir des recommandations personnalisées.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recommendations.map((r) => (
                  <li key={r.id}>
                    <Link to={`/cours/${r.id}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                      <SubjectIcon icon={r.subject.icon} color={r.subject.color} className="h-4 w-4" boxClass="h-9 w-9 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-ink">{r.title}</div>
                        <div className="truncate text-xs text-muted">{r.subject.name} · {r.chapter} · {r.durationMin} min</div>
                      </div>
                      <span className={`badge ${r.reason === "Matière à renforcer" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{r.reason}</span>
                      {r.isPremium && <PremiumBadge small />}
                      <TypeBadge type={r.type} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-6">
            <h2 className="mb-4 font-bold text-ink">Derniers QCM</h2>
            {recentAttempts.length === 0 ? (
              <p className="text-sm text-muted">Aucun QCM réalisé pour l'instant.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentAttempts.map((a) => {
                  const pct = Math.round((a.score / Math.max(1, a.total)) * 100);
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-3">
                      <SubjectIcon icon={a.subject.icon} color={a.subject.color} className="h-4 w-4" boxClass="h-9 w-9 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/qcm/${a.quiz.id}`} className="truncate text-sm font-medium text-ink hover:text-brand-700">{a.quiz.title}</Link>
                        <div className="text-xs text-muted">{new Date(a.createdAt).toLocaleDateString("fr-MA")}</div>
                      </div>
                      <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${pct >= 70 ? "bg-emerald-50 text-emerald-700" : pct >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{a.score}/{a.total}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-ink"><TrendingUp className="h-4 w-4 text-brand-600" /> Activité (7 jours)</h2>
            <div className="flex h-28 items-end gap-2">
              {activity.map((a) => {
                const v = a.lessons + a.quizzes;
                return (
                  <div key={a.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-t-md bg-brand-500" style={{ height: `${(v / maxAct) * 90 + 4}%`, opacity: v ? 1 : 0.2 }} title={`${a.lessons} cours, ${a.quizzes} QCM`} />
                    <span className="text-[10px] text-muted">{days[new Date(a.date).getDay()]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 font-bold text-ink">Performance par matière</h2>
            {performance.length === 0 ? (
              <p className="text-sm text-muted">Réalisez des QCM pour voir vos points forts et vos points à renforcer.</p>
            ) : (
              <ul className="space-y-3">
                {performance.map((p) => (
                  <li key={p.subject.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-700"><SubjectIcon icon={p.subject.icon} color={p.subject.color} className="h-3.5 w-3.5" boxClass="h-6 w-6 !rounded-md" /> {p.subject.name}</span>
                      <span className="font-bold" style={{ color: p.subject.color }}>{p.rate}%</span>
                    </div>
                    <ProgressBar value={p.rate} color={p.subject.color} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!isPremium && (
            <div className="card border-accent-500/40 bg-gradient-to-br from-amber-50 to-white p-6">
              <Crown className="h-6 w-6 text-accent-600" />
              <h3 className="mt-2 font-bold text-ink">Passez à Premium</h3>
              <p className="mt-1 text-sm text-muted">Résumés, examens corrigés et plan de préparation illimité.</p>
              <Link to="/premium" className="btn-accent mt-4 w-full">Découvrir <ArrowRight className="h-4 w-4" /></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
