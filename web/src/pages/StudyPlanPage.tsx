import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, Clock, HelpCircle, Sparkles, Target } from "lucide-react";
import { useFetch } from "../lib/hooks";
import type { Level, StudyPlan, Subject } from "../lib/types";
import { ErrorBox, PageHeader, Paywall, Spinner, SubjectIcon } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

type LevelData = Level & { subjects: { id: string; subject: Subject; lessons: number; quizzes: number }[] };

export default function StudyPlanPage() {
  const { user, isPremium } = useAuth();
  const { data: plan, loading, error, reload, setData } = useFetch<StudyPlan | null>("/me/study-plan");
  const { data: level } = useFetch<LevelData>(user?.level ? `/levels/${user.level.slug}` : null, [user?.levelId]);
  const [form, setForm] = useState({ goal: "", examDate: "", hoursPerWeek: 6, subjectIds: [] as string[] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (plan) setForm({ goal: plan.goal, examDate: plan.examDate ? plan.examDate.slice(0, 10) : "", hoursPerWeek: plan.hoursPerWeek, subjectIds: plan.subjectIds });
  }, [plan]);

  if (loading) return <Spinner />;
  if (error) return <div className="container-x py-10"><ErrorBox message={error} retry={reload} /></div>;

  if (!user?.level)
    return (
      <div className="container-x max-w-2xl py-10">
        <PageHeader title="Plan d'étude personnalisé" />
        <ErrorBox message="Choisissez d'abord votre niveau dans votre profil pour générer un plan." />
        <div className="mt-4 text-center"><Link to="/profil" className="btn-primary">Choisir mon niveau</Link></div>
      </div>
    );

  const toggleSubject = (id: string) =>
    setForm((f) => ({ ...f, subjectIds: f.subjectIds.includes(id) ? f.subjectIds.filter((x) => x !== id) : [...f.subjectIds, id] }));

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const p = await api.post<StudyPlan>("/me/study-plan", { ...form, examDate: form.examDate || undefined, hoursPerWeek: Number(form.hoursPerWeek) });
      setData(p);
      setEditing(false);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const showForm = !plan || editing;
  const visibleWeeks = isPremium ? plan?.plan ?? [] : (plan?.plan ?? []).slice(0, 1);

  return (
    <div className="container-x py-10">
      <PageHeader
        eyebrow={<span className="flex items-center gap-1"><Sparkles className="h-4 w-4" /> Préparation personnalisée</span>}
        title="Mon plan d'étude"
        subtitle="Un programme hebdomadaire construit à partir de votre niveau, de vos matières, de votre temps disponible et de vos résultats aux QCM."
        actions={plan && !editing && <button className="btn-outline" onClick={() => setEditing(true)}>Modifier le plan</button>}
      />

      {showForm && (
        <form onSubmit={generate} className="card mb-8 grid gap-5 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label" htmlFor="study-plan-page-70">Objectif</label>
            <input id="study-plan-page-70" className="input" required placeholder="Ex. : Réussir le bac 2027 avec mention" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="study-plan-page-74">Date de l'examen (optionnel)</label>
            <input id="study-plan-page-74" className="input" type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="study-plan-page-78">Heures disponibles par semaine : <strong>{form.hoursPerWeek} h</strong></label>
            <input id="study-plan-page-78" type="range" min={1} max={30} value={form.hoursPerWeek} onChange={(e) => setForm({ ...form, hoursPerWeek: Number(e.target.value) })} className="w-full accent-brand-600" />
          </div>
          <div className="md:col-span-2">
            <p className="label" id="study-plan-subjects">Matières à préparer ({user.level.name})</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="study-plan-subjects">
              {(level?.subjects ?? []).filter((s) => s.lessons + s.quizzes > 0).map((s) => {
                const on = form.subjectIds.includes(s.subject.id);
                return (
                  <button type="button" key={s.id} onClick={() => toggleSubject(s.subject.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${on ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>
                    <SubjectIcon icon={s.subject.icon} color={s.subject.color} className="h-3.5 w-3.5" boxClass="h-6 w-6 !rounded-md" /> {s.subject.name}
                  </button>
                );
              })}
            </div>
          </div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{err}</p>}
          <div className="flex gap-2 md:col-span-2">
            <button className="btn-primary" disabled={busy || form.subjectIds.length === 0}><Target className="h-4 w-4" /> {busy ? "Génération…" : "Générer mon plan"}</button>
            {editing && <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Annuler</button>}
          </div>
        </form>
      )}

      {plan && !editing && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="card flex items-center gap-3 p-4"><Target className="h-6 w-6 text-brand-600" /><div><div className="text-xs text-muted">Objectif</div><div className="font-semibold text-ink">{plan.goal}</div></div></div>
            <div className="card flex items-center gap-3 p-4"><CalendarDays className="h-6 w-6 text-brand-600" /><div><div className="text-xs text-muted">Examen</div><div className="font-semibold text-ink">{plan.examDate ? new Date(plan.examDate).toLocaleDateString("fr-MA") : "Non précisé"}</div></div></div>
            <div className="card flex items-center gap-3 p-4"><Clock className="h-6 w-6 text-brand-600" /><div><div className="text-xs text-muted">Rythme</div><div className="font-semibold text-ink">{plan.hoursPerWeek} h / semaine · {plan.plan.length} semaines</div></div></div>
          </div>

          <div className="space-y-5">
            {visibleWeeks.map((w) => (
              <div key={w.week} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                  <h3 className="font-bold text-ink">Semaine {w.week}</h3>
                  <span className="text-sm text-muted">{Math.round(w.minutes / 60 * 10) / 10} h</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {w.tasks.map((t, i) => (
                    <li key={i}>
                      <Link to={t.kind === "lesson" ? `/cours/${t.id}` : `/qcm/${t.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${t.subjectColor}1a`, color: t.subjectColor }}>
                          {t.kind === "lesson" ? <BookOpen className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-ink">{t.title}</div>
                          <div className="truncate text-xs text-muted">{t.subject} · {t.chapter}</div>
                        </div>
                        <span className="text-xs text-muted">{t.minutes} min</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!isPremium && plan.plan.length > 1 && <Paywall title={`Débloquez les ${plan.plan.length - 1} semaines restantes de votre plan`} />}
          </div>
        </>
      )}
    </div>
  );
}
