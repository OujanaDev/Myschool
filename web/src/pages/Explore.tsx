import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import { useFetch } from "../lib/hooks";
import type { Cycle, Level } from "../lib/types";
import { ComingSoonBadge, ErrorBox, PageHeader, Spinner } from "../components/ui";

const CYCLE_COLORS: Record<string, string> = {
  primaire: "from-brand-600 to-brand-500",
  college: "from-brand-800 to-brand-700",
  lycee: "from-[#123c3b] to-[#0d524e]",
  superieur: "from-accent-600 to-accent-500",
};

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

// The card shows the filière, not the whole level name: the track heading already says "2ème année Bac",
// and long names were truncated so that "Sciences Mathématiques A" and "… B" looked the same.
const ABBREVIATIONS: [RegExp, string][] = [
  [/^(Tronc commun|1ère Bac|2ème Bac|CPGE|Concours)\s+/i, ""],
  [/Sciences de la Vie et de la Terre/i, "SVT"],
  [/Sciences Mathématiques/i, "Sciences Math"],
  [/Sciences Expérimentales/i, "Sciences Exp."],
  [/Lettres et Sciences Humaines/i, "Lettres & Sc. Humaines"],
  [/Sciences Économiques et Gestion/i, "Sciences Éco & Gestion"],
  [/Sciences Économiques/i, "Sciences Éco"],
  [/Sciences de Gestion Comptable/i, "Gestion Comptable"],
];
export function filiereName(level: Pick<Level, "name" | "track">) {
  if (!level.track) return level.name;
  return ABBREVIATIONS.reduce((n, [re, to]) => n.replace(re, to), level.name);
}

export default function Explore() {
  const { data: cycles, loading, error, reload } = useFetch<Cycle[]>("/cycles");
  const { hash } = useLocation();
  // Cycles that are not open yet stay folded; a link such as /explorer#primaire unfolds that one.
  const [unfolded, setUnfolded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!hash || !cycles) return;
    setUnfolded((u) => ({ ...u, [hash.slice(1)]: true }));
    // Scroll once the section (and its unfolded levels) is laid out.
    requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [hash, cycles]);
  if (loading) return <Spinner />;
  if (error || !cycles) return <div className="container-x py-10"><ErrorBox message={error ?? "Erreur"} retry={reload} /></div>;

  // Open cycles first (the lycée today), the others folded below.
  const ordered = [...cycles.filter((c) => !c.comingSoon), ...cycles.filter((c) => c.comingSoon)];

  return (
    <div className="container-x py-10">
      <PageHeader eyebrow="Catalogue" title="Choisissez votre niveau" subtitle="Tous les niveaux du système éducatif marocain, du primaire aux concours d'accès aux grandes écoles." />
      <div className="space-y-10">
        {ordered.map((c) => {
          const folded = !!c.comingSoon && !unfolded[c.slug];
          const header = (
            <>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <h2 className="text-xl font-bold">{c.name}</h2>
                <p className="text-sm text-white/80">{c.description}</p>
              </div>
              {c.comingSoon && <ComingSoonBadge className="hidden shrink-0 !bg-white !text-accent-600 sm:inline-flex" />}
            </>
          );
          return (
            <section key={c.id} id={c.slug} className="scroll-mt-24">
              {c.comingSoon ? (
                <button
                  type="button"
                  onClick={() => setUnfolded((u) => ({ ...u, [c.slug]: folded }))}
                  aria-expanded={!folded}
                  aria-controls={`cycle-${c.slug}`}
                  className={`mb-5 flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r ${CYCLE_COLORS[c.slug] ?? "from-brand-600 to-brand-500"} p-5 text-white transition-opacity hover:opacity-95`}
                >
                  {header}
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-white/90">
                    {folded ? `Voir les ${c.levels.length} niveaux` : "Replier"}
                    <ChevronDown className={`h-5 w-5 transition-transform ${folded ? "" : "rotate-180"}`} aria-hidden="true" />
                  </span>
                </button>
              ) : (
                <div className={`mb-5 flex items-center gap-4 rounded-2xl bg-gradient-to-r ${CYCLE_COLORS[c.slug] ?? "from-brand-600 to-brand-500"} p-5 text-white`}>{header}</div>
              )}
              <div id={`cycle-${c.slug}`} hidden={folded}>
                {groupByTrack(c.levels).map((g) => (
                  <div key={g.track || "_"} className="mb-6">
                    {g.track && <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{g.track}</h3>}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {g.levels.map((l) =>
                        c.comingSoon ? (
                          <div key={l.id} className="card flex items-center gap-4 p-4 opacity-80" aria-disabled="true">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f1f4f1] text-center text-xs font-extrabold leading-tight text-muted">{l.shortName || l.name.slice(0, 3)}</span>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold leading-snug text-ink">{filiereName(l)}</h4>
                              <ComingSoonBadge className="mt-1" />
                            </div>
                          </div>
                        ) : (
                          <Link key={l.id} to={`/niveau/${l.slug}`} title={l.name} className="card group flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-center text-xs font-extrabold leading-tight text-slate-700 group-hover:bg-brand-50 group-hover:text-brand-700">
                              {l.shortName || l.name.slice(0, 3)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold leading-snug text-ink">{filiereName(l)}</h4>
                              <p className="text-xs text-muted">{l._count?.subjects ?? 0} matières</p>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand-600" />
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
