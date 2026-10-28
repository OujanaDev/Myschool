import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useDebounce, useFetch } from "../lib/hooks";
import type { Cycle, SearchResult } from "../lib/types";
import { EmptyState, PremiumBadge, Spinner, SubjectIcon, TypeBadge } from "../components/ui";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [level, setLevel] = useState(params.get("level") ?? "");
  const dq = useDebounce(q, 300);
  const { data: cycles } = useFetch<Cycle[]>("/cycles");
  const path = dq.trim().length >= 2 ? `/search?q=${encodeURIComponent(dq.trim())}${level ? `&level=${level}` : ""}` : null;
  const { data, loading } = useFetch<SearchResult>(path);

  useEffect(() => {
    const p: Record<string, string> = {};
    if (dq) p.q = dq;
    if (level) p.level = level;
    setParams(p, { replace: true });
  }, [dq, level, setParams]);

  const total = data ? data.lessons.length + data.quizzes.length + data.chapters.length + data.levels.length + data.subjects.length : 0;

  return (
    <div className="container-x max-w-4xl py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Rechercher</h1>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input autoFocus type="search" aria-label="Rechercher un cours, un QCM, un niveau" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex. : Pythagore, logarithme, Candide, ondes…" className="input !py-3 !pl-11 !text-base" />
        </div>
        <select aria-label="Filtrer par niveau" value={level} onChange={(e) => setLevel(e.target.value)} className="input sm:w-64">
          <option value="">Tous les niveaux</option>
          {(cycles ?? []).map((c) => (
            <optgroup key={c.id} label={c.name}>
              {c.levels.map((l) => (
                <option key={l.id} value={l.slug}>{l.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="mt-8">
        {loading && <Spinner />}
        {!loading && path && data && total === 0 && <EmptyState title="Aucun résultat" text="Essayez avec un autre mot-clé ou retirez le filtre de niveau." />}
        {!path && <p className="text-center text-sm text-muted">Tapez au moins 2 caractères pour lancer la recherche.</p>}
        {!loading && data && total > 0 && (
          <div className="space-y-8">
            {data.levels.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Niveaux</h2>
                <div className="flex flex-wrap gap-2">
                  {data.levels.map((l) => (
                    <Link key={l.id} to={`/niveau/${l.slug}`} className="badge bg-white ring-1 ring-slate-200 hover:ring-brand-400 !px-3 !py-1.5 !text-sm">{l.name}</Link>
                  ))}
                </div>
              </section>
            )}
            {data.subjects.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Matières</h2>
                <div className="flex flex-wrap gap-2">
                  {data.subjects.map((s) => (
                    <span key={s.id} className="badge bg-white ring-1 ring-slate-200 !px-3 !py-1.5 !text-sm"><SubjectIcon icon={s.icon} color={s.color} className="h-3.5 w-3.5" boxClass="h-5 w-5 !rounded-md" /> {s.name}</span>
                  ))}
                </div>
              </section>
            )}
            {data.chapters.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Chapitres ({data.chapters.length})</h2>
                <div className="card divide-y divide-slate-100">
                  {data.chapters.map((c) => (
                    <Link key={c.id} to={`/niveau/${c.level.slug}/${c.subject.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50/50">
                      <SubjectIcon icon={c.subject.icon} color={c.subject.color} className="h-4 w-4" boxClass="h-9 w-9 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-ink">{c.title}</div>
                        <div className="truncate text-xs text-muted">{c.level.name} · {c.subject.name} · Semestre {c.semester} · {c.lessons} cours · {c.quizzes} QCM</div>
                      </div>
                      <span className="badge bg-slate-100 text-slate-700">Chapitre</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {data.lessons.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Cours et exercices ({data.lessons.length})</h2>
                <div className="card divide-y divide-slate-100">
                  {data.lessons.map((l) => (
                    <Link key={l.id} to={`/cours/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50/50">
                      <SubjectIcon icon={l.subject.icon} color={l.subject.color} className="h-4 w-4" boxClass="h-9 w-9 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-ink">{l.title}</div>
                        <div className="truncate text-xs text-muted">{l.level.name} · {l.subject.name} · {l.chapter}</div>
                      </div>
                      {l.isPremium && <PremiumBadge small />}
                      <TypeBadge type={l.type} />
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {data.quizzes.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">QCM ({data.quizzes.length})</h2>
                <div className="card divide-y divide-slate-100">
                  {data.quizzes.map((x) => (
                    <Link key={x.id} to={`/qcm/${x.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50/50">
                      <SubjectIcon icon={x.subject.icon} color={x.subject.color} className="h-4 w-4" boxClass="h-9 w-9 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-ink">{x.title}</div>
                        <div className="truncate text-xs text-muted">{x.level.name} · {x.subject.name} · {x.questions} questions</div>
                      </div>
                      {x.isPremium && <PremiumBadge small />}
                      <span className="badge bg-amber-100 text-amber-800">QCM</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
