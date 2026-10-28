import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Clock, Eye, HelpCircle, Lock } from "lucide-react";
import { useFetch } from "../lib/hooks";
import type { Chapter, Level, Subject } from "../lib/types";
import { Breadcrumbs, EmptyState, ErrorBox, PageHeader, PremiumBadge, Spinner, SubjectIcon, TypeBadge, ProgressBar } from "../components/ui";
import { useAuth } from "../lib/auth";

type Data = { level: Level & { cycle: { name: string } }; subject: Subject; chapters: Chapter[]; completed: string[] };

export default function SubjectPage() {
  const { slug, subjectSlug } = useParams();
  const { data, loading, error, reload } = useFetch<Data>(`/levels/${slug}/subjects/${subjectSlug}`);
  const { isPremium } = useAuth();

  if (loading) return <Spinner />;
  if (error || !data) return <div className="container-x py-10"><ErrorBox message={error ?? "Erreur"} retry={reload} /></div>;

  const total = data.chapters.reduce((a, c) => a + c.lessons.length, 0);
  const done = data.chapters.reduce((a, c) => a + c.lessons.filter((l) => data.completed.includes(l.id)).length, 0);
  const semesters = [1, 2].filter((s) => data.chapters.some((c) => c.semester === s));

  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Explorer", to: "/explorer" }, { label: data.level.name, to: `/niveau/${data.level.slug}` }, { label: data.subject.name }]} />
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <SubjectIcon icon={data.subject.icon} color={data.subject.color} className="h-8 w-8" boxClass="h-16 w-16" />
          <div>
            <div className="text-sm font-medium text-brand-700">{data.level.name}</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">{data.subject.name}</h1>
            <p className="mt-1 text-sm text-muted">{data.chapters.length} chapitres · {total} contenus</p>
          </div>
        </div>
        {total > 0 && (
          <div className="w-full lg:w-72">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-muted">Progression</span>
              <span className="font-semibold text-ink">{done}/{total}</span>
            </div>
            <ProgressBar value={(done / total) * 100} color={data.subject.color} />
          </div>
        )}
      </div>

      {data.chapters.length === 0 ? (
        <EmptyState title="Aucun chapitre disponible" text="Le programme de cette matière sera ajouté prochainement." />
      ) : (
        semesters.map((s) => (
          <section key={s} className="mb-10">
            <h2 className="mb-4 text-lg font-bold text-ink">
              <span className="mr-2 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">Semestre {s}</span>
            </h2>
            <div className="space-y-4">
              {data.chapters.filter((c) => c.semester === s).map((c, idx) => (
                <div key={c.id} className="card overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-700 ring-1 ring-slate-200">{idx + 1}</span>
                    <h3 className="font-semibold text-ink">{c.title}</h3>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {c.lessons.map((l) => {
                      const locked = l.isPremium && !isPremium;
                      const completed = data.completed.includes(l.id);
                      return (
                        <li key={l.id}>
                          <Link to={`/cours/${l.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-brand-50/50">
                            {completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" /> : locked ? <Lock className="h-5 w-5 shrink-0 text-accent-500" /> : <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />}
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{l.title}</span>
                            <div className="hidden items-center gap-3 text-xs text-muted sm:flex">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {l.durationMin} min</span>
                              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {l.views}</span>
                            </div>
                            {l.isPremium && <PremiumBadge small />}
                            <TypeBadge type={l.type} />
                          </Link>
                        </li>
                      );
                    })}
                    {c.quizzes.map((q) => {
                      const locked = q.isPremium && !isPremium;
                      return (
                        <li key={q.id}>
                          <Link to={`/qcm/${q.id}`} className="flex items-center gap-3 bg-amber-50/30 px-5 py-3 transition-colors hover:bg-amber-50">
                            {locked ? <Lock className="h-5 w-5 shrink-0 text-accent-500" /> : <HelpCircle className="h-5 w-5 shrink-0 text-amber-500" />}
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{q.title}</span>
                            <span className="hidden text-xs text-muted sm:block">{q._count?.questions ?? 0} questions · {q.durationMin} min</span>
                            {q.isPremium && <PremiumBadge small />}
                            <span className="badge bg-amber-100 text-amber-800">QCM</span>
                          </Link>
                        </li>
                      );
                    })}
                    {c.lessons.length === 0 && c.quizzes.length === 0 && <li className="px-5 py-3 text-sm text-muted">Contenu à venir.</li>}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
