import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Atom, BadgeCheck, BookOpen, BriefcaseBusiness, Check, ClipboardList, Clock, Cog, Flag, GraduationCap, Heart, Leaf, Languages, ListChecks, MoreHorizontal, PenLine, Play, Search, Sigma, Smartphone, Stethoscope, TrendingUp, Users, Bold } from "lucide-react";
import { useFetch } from "../lib/hooks";
import type { Cycle, HomeData } from "../lib/types";
import { useAuth } from "../lib/auth";
import { ComingSoonBadge, SubjectIcon } from "../components/ui";
import HomeQuiz from "../components/HomeQuiz";
import Markdown from "../components/Markdown";
import { PREMIUM } from "./PremiumPage";

const nf = new Intl.NumberFormat("fr-MA");
const fmt = (n: number | undefined) => (n === undefined ? "—" : nf.format(n));

// One tinted panel per cycle, in catalogue order (primaire, collège, lycée, supérieur).
const CYCLE_TONES = ["bg-[#fee8d7]", "bg-[#dfeef4]", "bg-[#e9e2f5]", "bg-[#dcefe6]"];
const CYCLE_ICONS = [Leaf, Sigma, Atom, BookOpen];
const CONCOURS_TONES = ["bg-[#dcefe9] text-[#18846f]", "bg-[#e3e9fa] text-[#526fb5]", "bg-[#f9e1df] text-[#d06a62]"];
// One drawn icon per concours, by its level slug.
const concoursIcon = (slug: string) => (/medecine/.test(slug) ? Stethoscope : /ensa/.test(slug) ? Cog : BriefcaseBusiness);

// Figures shown in the proof band. The first two are the owner's claims (not measured by the app): edit them here.
const CLAIMS = { students: 5000, bacRate: 100 };

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up from 0 the first time it scrolls into view. */
function CountUp({ value, prefix = "", suffix = "" }: { value: number | undefined; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || started) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setStarted(true);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started || value === undefined) return;
    if (reducedMotion()) return setShown(value);
    const t0 = performance.now();
    const dur = 1400;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, value]);
  return (
    <span ref={ref}>
      {prefix}
      {value === undefined ? "—" : nf.format(started ? shown : 0)}
      {suffix}
    </span>
  );
}

/** Two selects (cycle, level) that open the level's programme: the parents' entry point. */
function LevelFinder({ cycles }: { cycles: Cycle[] | null }) {
  const navigate = useNavigate();
  const [cycleId, setCycleId] = useState("");
  const [levelSlug, setLevelSlug] = useState("");
  const cycle = cycles?.find((c) => c.id === cycleId) ?? null;
  const levels = cycle?.levels ?? [];
  return (
    <form
      className="w-full max-w-[400px] rounded-[13px] bg-white p-6 shadow-[0_15px_35px_rgba(50,83,76,0.12)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (levelSlug) navigate(`/niveau/${levelSlug}`);
      }}
    >
      <p className="m-0 flex items-center gap-2 font-display text-[19px] font-semibold text-ink">
        <GraduationCap className="h-5 w-5 text-brand-600" aria-hidden="true" /> Trouver le niveau de mon enfant
      </p>
      <p className="mb-5 mt-1 text-xs leading-5 text-muted">Choisissez le cycle puis la classe : le programme complet s'ouvre, gratuitement.</p>
      <label className="block text-xs font-semibold text-ink">
        Cycle
        <select
          className="input mt-1.5 !rounded-[9px]"
          value={cycleId}
          onChange={(e) => {
            setCycleId(e.target.value);
            setLevelSlug("");
          }}
        >
          <option value="">{cycles ? "Choisir un cycle" : "Chargement…"}</option>
          {cycles?.map((c) => (
            <option key={c.id} value={c.id} disabled={c.comingSoon}>{c.name}{c.comingSoon ? " (bientôt)" : ""}</option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-xs font-semibold text-ink">
        Classe
        <select className="input mt-1.5 !rounded-[9px]" value={levelSlug} onChange={(e) => setLevelSlug(e.target.value)} disabled={!cycle}>
          <option value="">{cycle ? "Choisir une classe" : "D'abord le cycle"}</option>
          {levels.map((l) => (
            <option key={l.id} value={l.slug}>{l.name}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={!levelSlug} className="btn-primary mt-5 w-full !rounded-[9px] !py-3 disabled:opacity-50">
        Voir le programme <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function Eyebrow({ children, tone = "orange" }: { children: React.ReactNode; tone?: "orange" | "teal" | "light" }) {
  const color = tone === "teal" ? "text-brand-600" : tone === "light" ? "text-white/85" : "text-accent-600";
  return <p className={`m-0 mb-4 text-[11px] font-bold uppercase tracking-[1.25px] ${color}`}>{children}</p>;
}

function H2({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`m-0 font-display text-[34px] font-bold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[40px] ${className}`}>{children}</h2>;
}

export default function Home() {
  const { data } = useFetch<HomeData>("/home");
  const { data: allCycles } = useFetch<Cycle[]>("/cycles");
  const superieurSoon = data?.cycles.find((c) => c.slug === "superieur")?.comingSoon ?? false;
  const { user } = useAuth();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [cycle, setCycle] = useState("tous");

  // Nav links such as /#qcm arrive with a hash: scroll to that section once the page has its content.
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, data]);

  const featured = useMemo(() => {
    const t = term.trim().toLocaleLowerCase("fr");
    return (data?.featured ?? []).filter((c) => (cycle === "tous" || c.cycle === cycle) && (!t || `${c.title} ${c.subject.name} ${c.level.name}`.toLocaleLowerCase("fr").includes(t)));
  }, [data, term, cycle]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (term.trim()) navigate(`/recherche?q=${encodeURIComponent(term.trim())}`);
  };

  const stats = data?.stats;
  const spot = data?.spotlight;

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-[1210px] flex-col items-center gap-10 overflow-x-clip px-5 pb-10 pt-11 lg:min-h-[610px] lg:flex-row lg:gap-[60px] lg:pt-[60px]">
        <div className="fade-up w-full lg:w-[52%]">
          <Eyebrow>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent-400 align-middle" aria-hidden="true" />
            Programmes scolaires marocains
          </Eyebrow>
          <h1 className="m-0 font-display text-[44px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[52px] lg:text-[61px]">
            Ta réussite commence
            <br />
            <em className="not-italic text-brand-600">ici.</em>
          </h1>
          <p className="mb-4 mt-6 max-w-[480px] text-[17px] leading-[1.65] text-muted">
            Votre <b> réussite</b> commence ici ! Retrouvez sur Naja7School tout ce dont vous avez besoin pour apprendre, progresser et réussir, du primaire aux études supérieures.
          </p>
          <ul className="m-0 mb-7 flex max-w-[480px] list-none flex-wrap gap-2 p-0" aria-label="Ce que tu trouves sur Naja7School">
            {[
              { to: "/explorer", icon: BookOpen, label: "Cours simplifiés" },
              { to: "/explorer", icon: PenLine, label: "Exercices corrigés" },
              { to: "#qcm", icon: ListChecks, label: "QCM interactifs" },
              { to: "/plan-etude", icon: Clock, label: "Révisions adaptées" },
            ].map(({ to, icon: Icon, label }) => {
              const cls = "inline-flex items-center gap-1.5 rounded-full border border-[#dce5df] bg-white px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700";
              return (
                <li key={label}>
                  {to.startsWith("#") ? (
                    <a href={to} className={cls}><Icon className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> {label}</a>
                  ) : (
                    <Link to={to} className={cls}><Icon className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> {label}</Link>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link to={user ? "/tableau-de-bord" : "/explorer"} className="btn-primary !rounded-[9px] !px-5 !py-4 !text-[15px] shadow-[0_5px_12px_rgba(11,125,118,0.15)]">
              {user ? "Accéder à mon espace" : "Découvrir les cours"} <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
            <a href="#qcm" className="inline-flex items-center gap-2 font-semibold text-ink hover:text-brand-600">
              <span className="grid h-[34px] w-[34px] place-items-center rounded-full border border-[#ddd9cc] bg-white text-brand-600">
                <Play className="h-3 w-3 fill-current" aria-hidden="true" />
              </span>
              Essayer un QCM
            </a>
          </div>
          <div className="mt-10 flex items-center gap-3.5">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="grid h-[29px] w-[29px] place-items-center rounded-[8px] bg-[#e99f6e] text-white"><Sigma className="h-3.5 w-3.5" /></span>
              <span className="grid h-[29px] w-[29px] place-items-center rounded-[8px] bg-[#48667b] text-white"><Atom className="h-3.5 w-3.5" /></span>
              <span className="grid h-[29px] w-[29px] place-items-center rounded-[8px] bg-[#966d61] text-white"><Leaf className="h-3.5 w-3.5" /></span>
              <span className="grid h-[29px] w-[29px] place-items-center rounded-[8px] bg-[#5b7a8c] text-white"><Languages className="h-3.5 w-3.5" /></span>
            </div>
            <p className="m-0 text-xs leading-[1.4] text-ink">
              <strong>{fmt(stats?.lessons)} cours et exercices</strong> dans {fmt(stats?.levels)} niveaux
              <br />
              <span className="text-muted">{fmt(stats?.subjects)} matières, du primaire aux concours</span>
            </p>
          </div>
        </div>

        {/* Lesson card over its orbits, with the floating QCM and score cards (demonstration values) */}
        <div className="fade-up relative grid h-[390px] w-full place-items-center lg:h-[450px] lg:w-[48%]" style={{ animationDelay: "120ms", background: "radial-gradient(circle at 50% 52%, #e6ece2 0 31%, transparent 32%)" }} aria-label="Aperçu d'une leçon">
          <div className="orbit absolute h-[330px] w-[330px] rounded-full border border-dashed border-[#cbd8d0]" aria-hidden="true" />
          <div className="orbit absolute h-[380px] w-[380px] rounded-full border border-dashed border-[#cbd8d0] lg:h-[450px] lg:w-[450px]" aria-hidden="true" style={{ animationDirection: "reverse", animationDuration: "90s" }} />
          <span className="absolute left-[5%] top-[19%] font-display text-[27px] font-bold text-accent-500" aria-hidden="true">∑</span>
          <span className="absolute right-[7%] top-[14%] font-display text-[27px] font-bold text-brand-500" aria-hidden="true">π</span>
          <span className="absolute bottom-[20%] right-0 font-display text-lg font-bold text-accent-500" aria-hidden="true">x²</span>

          <article className="z-[1] w-[300px] -rotate-2 rounded-[15px] bg-white p-3.5 shadow-[0_22px_55px_rgba(40,73,66,0.17)] sm:w-[330px]">
            <div className="mb-2.5 flex items-center gap-2 text-[11px] font-bold">
              <span className="rounded-[5px] bg-brand-50 px-1.5 py-1 text-brand-600">
                {spot ? <SubjectIcon icon={spot.subject.icon} color={spot.subject.color} className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
              </span>
              <span>{spot?.subject.name ?? "Mathématiques"}</span>
              <MoreHorizontal className="ml-auto h-4 w-4 text-muted" aria-hidden="true" />
            </div>
            <div className="relative h-[190px] overflow-hidden rounded-[9px] bg-[#f2bb90]">
              <span className="absolute -bottom-2.5 left-7 font-display text-[170px] leading-[0.8] text-[#fff0dd]" aria-hidden="true">∿</span>
              {/* The lesson's own first formula; a chapter without one shows its title. */}
              <div className="absolute right-4 top-6 max-w-[62%] text-right font-display text-[17px] font-semibold leading-snug text-[#286360]">
                {spot?.formula ? <Markdown content={spot.formula} className="text-[17px]! leading-snug! text-[#286360]! [&_p]:my-0! [&_.katex]:text-[1.1em]" /> : spot?.chapter ?? "f(x) = ax² + bx + c"}
              </div>
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2 text-[11px] font-semibold text-white">
                {spot?.hasVideo ? <Play className="h-3 w-3 fill-current" aria-hidden="true" /> : <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />}
                <div className="h-[3px] flex-1 bg-white/50"><i className="block h-full w-[53%] bg-white" /></div>
                <span>{spot?.hasVideo ? "Vidéo" : "Lire"} · {spot?.durationMin ?? 18} min</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-1 pb-0.5 pt-3 text-[11px]">
              <div className="min-w-0">
                <b className="line-clamp-2 leading-snug">{spot?.title ?? "Fonctions du second degré"}</b>
                <span className="mt-1 block text-muted">{spot?.level.shortName ?? "Leçon"} · {spot?.subject.name ?? "Mathématiques"}</span>
              </div>
              <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border-[3px] border-[#d9ece6] border-t-brand-600 font-display text-[13px] font-bold text-brand-600" aria-label="Progression 72 %">
                72<small className="text-[7px]">%</small>
              </div>
            </div>
          </article>

          <div className="drift absolute left-[1%] top-[28%] z-[2] flex items-center gap-2 rounded-[10px] bg-white p-2.5 text-[11px] shadow-[0_12px_30px_rgba(40,73,66,0.15)]">
            <span className="grid h-[23px] w-[23px] place-items-center rounded-[7px] bg-[#e0f3e9] text-[#168d62]"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>
            <div>
              <b className="block">QCM terminé !</b>
              <small className="mt-0.5 block text-[11px] text-muted">Excellent travail</small>
            </div>
          </div>
          <div className="drift absolute bottom-[20%] right-0 z-[2] rounded-[10px] bg-white py-2.5 pl-3 pr-10 shadow-[0_12px_30px_rgba(40,73,66,0.15)]" style={{ animationDelay: "1.1s" }}>
            <small className="block text-[11px] text-muted">Ton score</small>
            <b className="block font-display text-[22px] font-bold text-brand-600">18<span className="text-[10px]">/20</span></b>
            <TrendingUp className="absolute bottom-3 right-2.5 h-5 w-5 text-[#4ba978]" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Proof band: the owner's claims (CLAIMS) beside the live catalogue counts */}
      <section className="bg-mint px-5 py-10 sm:px-9" aria-label="Naja7School en chiffres">
        <div className="mx-auto w-full max-w-[1280px]">
          <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
            {[
              { icon: Users, value: CLAIMS.students, prefix: "+", label: "étudiants inscrits", sub: "et satisfaits" },
              { icon: GraduationCap, value: CLAIMS.bacRate, suffix: " %", label: "de réussite au bac", sub: "chez nos élèves" },
              { icon: BookOpen, value: stats?.lessons, label: "cours et exercices", sub: `dans ${fmt(stats?.levels)} niveaux` },
              { icon: ListChecks, value: stats?.questions, label: "questions de QCM", sub: "corrigées et expliquées" },
            ].map(({ icon: Icon, value, prefix, suffix, label, sub }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-white text-brand-600 shadow-[0_6px_14px_rgba(40,73,66,0.08)]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <dd className="m-0 font-display text-[32px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[36px]"><CountUp value={value} prefix={prefix} suffix={suffix} /></dd>
                  <dt className="mt-1.5 text-[13px] font-semibold text-[#3f5752]">{label}</dt>
                  <p className="m-0 text-xs text-[#4f6560]">{sub}</p>
                </div>
              </div>
            ))}
          </dl>

        </div>
      </section>

      {/* Cycles */}
      <section id="cours" className="mx-auto w-full max-w-[1210px] scroll-mt-20 px-5 py-20 lg:py-[100px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow tone="teal">Choisis ton parcours</Eyebrow>
            <H2>
              Apprendre à son
              <br />
              propre rythme.
            </H2>
          </div>
          <p className="m-0 max-w-[310px] text-sm leading-[1.6] text-muted">Du primaire aux classes préparatoires et aux concours, retrouve tous les contenus dont tu as besoin pour progresser.</p>
        </div>
        <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.cycles ?? []).map((c, i) => {
            const Icon = CYCLE_ICONS[i % 4];
            return (
              <article key={c.id} className={`relative flex min-h-[220px] flex-col overflow-hidden rounded-[13px] p-5 lg:min-h-[285px] ${CYCLE_TONES[i % 4]}`}>
                <Icon className="h-7 w-7 text-ink" aria-hidden="true" />
                <small className="mt-6 block text-[11px] text-[#3f5752]">{c.levels} niveaux</small>
                <h3 className="my-1 font-display text-2xl font-bold text-ink">{c.name}</h3>
                <p className="m-0 min-h-[37px] max-w-[190px] text-xs leading-[1.55] text-[#3f5752]">{c.description}</p>
                {c.comingSoon ? (
                  <ComingSoonBadge className="relative z-10 mt-4 self-start !bg-white/70" />
                ) : (
                  <Link to={`/explorer#${c.slug}`} className="relative z-10 mt-4 inline-flex items-center gap-2 text-xs font-bold text-ink hover:text-brand-600">
                    Explorer <ArrowRight className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  </Link>
                )}
                <strong className="pointer-events-none absolute -bottom-[18px] right-4 font-display text-[100px] font-extrabold leading-none text-white/55" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </strong>
              </article>
            );
          })}
        </div>
      </section>

      {/* Catalogue */}
      <section id="catalogue" className="mx-auto w-full max-w-[1210px] scroll-mt-20 px-5 pb-20 lg:pb-[105px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow tone="teal">Bibliothèque de cours</Eyebrow>
            <H2>
              Trouve exactement
              <br />
              ce qu'il te faut.
            </H2>
          </div>
          <p className="m-0 max-w-[325px] text-sm leading-[1.6] text-muted">Des parcours organisés par niveau, matière et chapitre. Voici les chapitres les plus complets de chaque cycle.</p>
        </div>
        <div className="mb-6 mt-9 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={submitSearch} role="search" className="flex h-12 w-full items-center gap-2 rounded-[9px] border border-[#dce5df] bg-white px-3.5 text-brand-600 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 lg:w-[360px]">
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} type="search" placeholder="Rechercher un chapitre, une matière…" aria-label="Rechercher un chapitre ou une matière" autoComplete="off" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
          </form>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par cycle">
            {[{ slug: "tous", name: "Tous" }, ...(data?.cycles ?? []).filter((c) => data?.featured.some((f) => f.cycle === c.slug))].map((c) => (
              <button key={c.slug} type="button" aria-pressed={cycle === c.slug} onClick={() => setCycle(c.slug)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${cycle === c.slug ? "bg-brand-600 text-white" : "bg-[#edf2ee] text-[#526663] hover:bg-brand-100"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
        {featured.length > 0 ? (
          // Six chapters on a phone, nine on a desktop; the whole library is one link away.
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*:nth-child(n+7)]:hidden lg:[&>*:nth-child(n+7)]:flex">
            {featured.slice(0, 9).map((c) => (
              <article key={c.id} className="flex flex-col rounded-xl border border-[#e0e7e1] bg-white p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_15px_28px_rgba(43,75,66,0.12)]">
                <div className="flex items-start justify-between">
                  <SubjectIcon icon={c.subject.icon} color={c.subject.color} boxClass="h-[42px] w-[42px] rounded-[10px]" />
                  <span className="rounded-[5px] bg-[#f1f4f1] px-2 py-1 text-[11px] text-muted">{c.level.name}</span>
                </div>
                <h3 className="mb-2 mt-5 font-display text-[19px] font-semibold leading-snug text-ink">{c.title}</h3>
                <p className="m-0 text-xs leading-[1.55] text-muted">{c.subject.name}</p>
                <div className="my-4 flex flex-wrap gap-x-3.5 gap-y-1 border-t border-[#edf0ed] pt-3 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" aria-hidden="true" /> {c.lessons} leçons</span>
                  {c.minutes > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" /> {c.minutes >= 60 ? `${Math.floor(c.minutes / 60)} h ${String(c.minutes % 60).padStart(2, "0")}` : `${c.minutes} min`}</span>}
                  {c.quizzes > 0 && <span className="inline-flex items-center gap-1"><ClipboardList className="h-3 w-3" aria-hidden="true" /> {c.quizzes} QCM</span>}
                </div>
                <Link to={`/niveau/${c.level.slug}/${c.subject.slug}`} className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline">
                  Voir le chapitre <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[13px] bg-[#e4efea] px-6 py-8 text-center">
            <p className="m-0 text-sm text-[#5f7370]">{data ? "Aucun chapitre ne correspond ici." : "Chargement du catalogue…"}</p>
            {term.trim() && (
              <button type="button" onClick={submitSearch} className="btn-primary mt-4 !rounded-[8px]">
                Chercher « {term.trim()} » dans tout le catalogue <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link to="/explorer" className="inline-flex items-center gap-2 rounded-lg border border-[#b8c9c3] px-4 py-3 text-[13px] font-bold text-ink hover:bg-white">
            Voir toute la bibliothèque <ArrowRight className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* QCM */}
      <section id="qcm" className="scroll-mt-20 overflow-hidden bg-[#157b74] text-white">
        <div className="relative mx-auto flex w-full max-w-[1210px] flex-col items-center gap-10 px-5 py-16 lg:min-h-[500px] lg:flex-row lg:justify-between">
          <div className="pointer-events-none absolute -right-[210px] -top-[50px] h-[600px] w-[600px] rounded-full border border-white/15" aria-hidden="true" />
          <div className="relative max-w-[480px]">
            <Eyebrow tone="light">Teste tes connaissances</Eyebrow>
            <h2 className="m-0 font-display text-[36px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[45px]">
              Prêt à relever
              <br />
              le défi ?
            </h2>
            <p className="my-5 max-w-[410px] text-[15px] leading-[1.6] text-white/90">Des milliers de questions pour t'entraîner, repérer tes lacunes et mesurer tes progrès, chapitre par chapitre.</p>
            <Link to={data?.demoQuiz ? `/qcm/${data.demoQuiz.id}` : "/explorer"} className="inline-flex items-center gap-3 rounded-lg bg-white px-[18px] py-[13px] text-sm font-bold text-brand-600 hover:bg-brand-50">
              Lancer un QCM <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <dl className="mt-11 flex flex-wrap gap-6 sm:gap-9">
              {[
                { v: stats?.questions, l: "Questions" },
                { v: stats?.subjects, l: "Matières" },
                { v: stats?.quizzes, l: "QCM" },
              ].map((s) => (
                <div key={s.l} className="border-l border-white/25 pl-3.5">
                  <dd className="m-0 font-display text-[23px] font-bold">{fmt(s.v)}</dd>
                  <dt className="mt-0.5 text-[11px] text-white/85">{s.l}</dt>
                </div>
              ))}
            </dl>
          </div>
          {data?.demoQuiz ? (
            <HomeQuiz quiz={data.demoQuiz} />
          ) : (
            <div className="relative z-10 h-[360px] w-full max-w-[400px] animate-pulse rounded-[13px] bg-white/20 lg:w-[385px]" aria-hidden="true" />
          )}
        </div>
      </section>

      {/* Concours */}
      <section id="concours" className="mx-auto w-full max-w-[1210px] scroll-mt-20 px-5 py-20 lg:py-[105px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow tone="teal">Objectif réussite</Eyebrow>
            <H2>
              Prépare tes concours
              <br />
              en toute confiance.
            </H2>
          </div>
          <Link to="/explorer#superieur" className="inline-flex items-center gap-2 self-start rounded-lg border border-[#b8c9c3] px-3.5 py-3 text-[13px] font-bold text-ink hover:bg-white">
            Voir tout le supérieur <ArrowRight className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-10 grid gap-[18px] md:grid-cols-3">
          {(data?.concours ?? []).map((l, i) => {
            const Icon = concoursIcon(l.slug);
            return (
            <article key={l.id} className="flex flex-col rounded-xl border border-[#e0e4dc] bg-paper p-6 transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(28,58,48,0.12)]">
              <span className={`mb-5 grid h-12 w-12 place-items-center rounded-[10px] ${CONCOURS_TONES[i % 3]}`}><Icon className="h-6 w-6" aria-hidden="true" /></span>
              <small className="text-[11px] uppercase tracking-[0.5px] text-muted">{l.track || "Concours d'accès"}</small>
              <h3 className="my-1 font-display text-[23px] font-bold leading-tight text-ink">{l.name.replace(/^Concours\s+/i, "")}</h3>
              <p className="m-0 min-h-[56px] text-xs leading-[1.6] text-muted">{l.description}</p>
              {l.subjects.length > 0 && (
                <ul className="my-4 mb-5 flex list-none flex-wrap gap-1.5 p-0">
                  {l.subjects.slice(0, 4).map((s) => (
                    <li key={s} className="rounded bg-[#eff3ee] px-2 py-1 text-[11px] text-muted">{s}</li>
                  ))}
                </ul>
              )}
              {superieurSoon ? (
                <ComingSoonBadge className="mt-auto self-start" />
              ) : (
                <Link to={`/niveau/${l.slug}`} className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline">
                  Découvrir le programme <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </article>
            );
          })}
        </div>
      </section>

      {/* Parents */}
      <section id="parents" className="mx-auto w-full max-w-[1210px] scroll-mt-20 px-5 pb-20 lg:pb-[100px]">
        <div className="flex flex-col items-center gap-10 rounded-[19px] bg-[#dfeef4] px-6 py-12 lg:flex-row lg:justify-between lg:gap-16 lg:px-12 lg:py-16">
          <div className="max-w-[520px]">
            <Eyebrow tone="teal">Espace parents</Eyebrow>
            <H2>
              Vous voulez suivre
              <br />
              les progrès de votre enfant ?
            </H2>
            <p className="my-4 text-sm leading-[1.6] text-[#3f5752]">Naja7School suit le programme officiel classe par classe. Votre enfant travaille à son rythme, et vous voyez où il en est.</p>
            <ul className="m-0 grid list-none gap-3 p-0 text-sm text-ink">
              {[
                { icon: BadgeCheck, text: "Conforme aux programmes marocains, du primaire au bac et aux concours" },
                { icon: TrendingUp, text: "Progression visible dans son espace : chapitres lus, scores aux QCM, plan de la semaine" },
                { icon: Heart, text: "Accès gratuit limité ; Premium à 99 DH par mois au lieu de 199 DH, sans engagement" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-white text-brand-600"><Icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  <span className="leading-6">{text}</span>
                </li>
              ))}
            </ul>
            <Link to="/inscription" className="btn-primary mt-6 !rounded-[9px] !px-[17px] !py-3 shadow-[0_5px_12px_rgba(11,125,118,0.15)]">
              Créer le compte de mon enfant <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <LevelFinder cycles={allCycles} />
        </div>
      </section>

      {/* Premium */}
      <section id="tarifs" className="mx-auto mb-6 w-full max-w-[1210px] scroll-mt-20 px-4 lg:mb-[90px]">
        <div className="flex flex-col items-center gap-8 rounded-[19px] bg-[#e5eee9] px-6 py-12 lg:flex-row lg:justify-between lg:gap-20 lg:px-12 lg:py-[75px]">
          <div>
            <Eyebrow tone="teal">Passe au niveau supérieur</Eyebrow>
            <H2>
              Tout ce dont tu as besoin
              <br />
              pour réussir.
            </H2>
            <p className="my-4 max-w-[450px] text-sm leading-[1.6] text-muted">Le contenu essentiel reste gratuit. Naja7School Premium ajoute tout ce qu'il faut pour viser l'excellence.</p>
            <ul className="m-0 list-none p-0 text-[13px] leading-8 text-[#49625f]">
              {PREMIUM.slice(1).map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[#16916e]" aria-hidden="true" /> {f}
                </li>
              ))}
            </ul>
            <Link to="/premium" className="btn-primary mt-5 !rounded-[9px] !px-[17px] !py-3 shadow-[0_5px_12px_rgba(11,125,118,0.15)]">
              Voir les offres <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <small className="mt-3 block text-xs text-muted">Accès gratuit limité · Offre de lancement -50 % jusqu'au 30/12/2026</small>
          </div>
          <div className="relative w-full max-w-[360px] rounded-[14px] bg-white p-7 shadow-[0_15px_35px_rgba(50,83,76,0.12)] lg:min-w-[330px]">
            <span className="absolute -top-[11px] right-4 rounded-xl bg-accent-600 px-2.5 py-1 text-[10px] font-bold tracking-[0.5px] text-white">-50 % JUSQU'AU 30/12/2026</span>
            <p className="m-0 text-[11px] font-bold tracking-[1px] text-brand-600">NAJA7SCHOOL PREMIUM</p>
            <h3 className="mb-0 mt-2 font-display text-[40px] font-bold leading-none text-ink">
              99 <small className="font-sans text-[13px] font-medium">DH / mois</small>{" "}
              <small className="font-sans text-[13px] font-medium text-muted line-through">199 DH</small>
            </h3>
            <span className="mt-2 block text-[11px] text-muted">
              ou 899 DH / an <s>1 798 DH</s> <b className="text-[#14846d]">Accès complet, sans engagement</b>
            </span>
            <hr className="my-5 border-0 border-t border-[#e4e9e5]" />
            <div className="text-xs leading-[1.8] text-muted">
              Accès à tous les niveaux
              <br />
              <b>Résumés, examens blancs, plan d'étude</b>
            </div>
            <Link to="/premium" className="btn-primary mt-5 w-full !rounded-[8px] !py-3 !text-[13px]">
              Choisir Premium <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
