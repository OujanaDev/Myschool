import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { useFetch } from "../lib/hooks";
import type { Cycle, Level } from "../lib/types";
import { ErrorBox, PageHeader, Spinner } from "../components/ui";

const CYCLE_COLORS = ["from-brand-600 to-brand-500", "from-brand-800 to-brand-700", "from-slate-800 to-slate-700", "from-accent-600 to-accent-500"];

function groupByTrack(levels: Level[]) {
  const groups: { track: string; levels: Level[] }[] = [];
  for (const l of levels) {
    let g = groups.find((x) => x.track === l.track);
    if (!g) {
      g = { track: l.track, levels: [] };
      groups.push(g);
    }
    g.levels.push(l);
  }
  return groups;
}

export default function Explore() {
  const { data: cycles, loading, error, reload } = useFetch<Cycle[]>("/cycles");
  if (loading) return <Spinner />;
  if (error || !cycles) return <div className="container-x py-10"><ErrorBox message={error ?? "Erreur"} retry={reload} /></div>;

  return (
    <div className="container-x py-10">
      <PageHeader eyebrow="Catalogue" title="Choisissez votre niveau" subtitle="Tous les niveaux du système éducatif marocain, du primaire aux concours d'accès aux grandes écoles." />
      <div className="space-y-12">
        {cycles.map((c, i) => (
          <section key={c.id} id={c.slug} className="scroll-mt-24">
            <div className={`mb-5 flex items-center gap-4 rounded-2xl bg-gradient-to-r ${CYCLE_COLORS[i % 4]} p-5 text-white`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold">{c.name}</h2>
                <p className="text-sm text-white/80">{c.description}</p>
              </div>
            </div>
            {groupByTrack(c.levels).map((g) => (
              <div key={g.track || "_"} className="mb-6">
                {g.track && <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{g.track}</h3>}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {g.levels.map((l) => (
                    <Link key={l.id} to={`/niveau/${l.slug}`} className="card group flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-700 group-hover:bg-brand-50 group-hover:text-brand-700">
                        {l.shortName || l.name.slice(0, 3)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-semibold text-ink">{l.name}</h4>
                        <p className="text-xs text-muted">{l._count?.subjects ?? 0} matières</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-brand-600" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
