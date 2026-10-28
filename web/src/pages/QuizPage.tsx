import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, RotateCcw, Trophy, XCircle } from "lucide-react";
import { useFetch } from "../lib/hooks";
import type { AttemptResult, Quiz } from "../lib/types";
import { Breadcrumbs, ErrorBox, Paywall, PremiumBadge, ProgressBar, Spinner } from "../components/ui";
import Markdown from "../components/Markdown";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function QuizPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch<Quiz>(`/quizzes/${id}`);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [result]);

  const answered = useMemo(() => Object.keys(answers).length, [answers]);

  if (loading) return <Spinner />;
  if (error || !data) return <div className="container-x py-10"><ErrorBox message={error ?? "Erreur"} retry={reload} /></div>;
  const { level, subject } = data.chapter.levelSubject;

  if (data.locked)
    return (
      <div className="container-x py-10">
        <Breadcrumbs items={[{ label: level.name, to: `/niveau/${level.slug}` }, { label: subject.name, to: `/niveau/${level.slug}/${subject.slug}` }, { label: data.title }]} />
        <Paywall title="Ce QCM est réservé aux membres Premium" />
      </div>
    );

  const submit = async () => {
    if (!user) return navigate("/connexion", { state: { from: `/qcm/${data.id}` } });
    setBusy(true);
    try {
      setResult(await api.post<AttemptResult>(`/quizzes/${data.id}/attempts`, { answers }));
      window.scrollTo(0, 0);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };
  const restart = () => {
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setElapsed(0);
  };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (result) {
    const pct = Math.round((result.attempt.score / Math.max(1, result.attempt.total)) * 100);
    return (
      <div className="container-x max-w-3xl py-10">
        <div className="card p-8 text-center fade-up">
          <Trophy className={`mx-auto h-12 w-12 ${pct >= 70 ? "text-accent-500" : "text-slate-400"}`} />
          <h1 className="mt-4 text-3xl font-extrabold text-ink">{pct >= 70 ? "Bravo !" : pct >= 50 ? "Pas mal !" : "Continuez vos efforts"}</h1>
          <p className="mt-2 text-muted">Vous avez obtenu</p>
          <div className="mt-2 text-5xl font-extrabold text-brand-700">{result.attempt.score}/{result.attempt.total}</div>
          <div className="mx-auto mt-4 max-w-xs"><ProgressBar value={pct} color={pct >= 70 ? "#0f766e" : pct >= 50 ? "#f59e0b" : "#ef4444"} /></div>
          <p className="mt-2 text-sm text-muted">Temps : {fmt(elapsed)}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={restart} className="btn-primary"><RotateCcw className="h-4 w-4" /> Recommencer</button>
            <Link to={`/niveau/${level.slug}/${subject.slug}`} className="btn-outline">Retour au chapitre</Link>
          </div>
        </div>
        <h2 className="mb-4 mt-10 text-xl font-bold text-ink">Correction détaillée</h2>
        <div className="space-y-4">
          {data.questions.map((q, i) => {
            const r = result.review.find((x) => x.questionId === q.id)!;
            return (
              <div key={q.id} className={`card p-5 ${r.correct ? "border-emerald-200" : "border-red-200"}`}>
                <div className="flex items-start gap-3">
                  {r.correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-muted">Question {i + 1}</div>
                    <Markdown content={q.text} className="!text-[15px]" />
                    <ul className="mt-2 space-y-1.5">
                      {q.options.map((o) => {
                        const isCorrect = o.id === r.correctOptionId;
                        const isChosen = o.id === r.chosen;
                        return (
                          <li key={o.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isCorrect ? "bg-emerald-50 text-emerald-800" : isChosen ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-600"}`}>
                            <Markdown content={o.text} className="!text-sm" />
                            {isCorrect && <span className="ml-auto text-xs font-semibold">Bonne réponse</span>}
                            {isChosen && !isCorrect && <span className="ml-auto text-xs font-semibold">Votre réponse</span>}
                          </li>
                        );
                      })}
                    </ul>
                    {r.explanation && (
                      <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
                        <strong>Explication : </strong>
                        <Markdown content={r.explanation} className="!inline !text-sm" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const q = data.questions[current];
  if (!q)
    return (
      <div className="container-x py-10">
        <ErrorBox message="Ce QCM ne contient pas encore de questions." />
      </div>
    );

  return (
    <div className="container-x max-w-3xl py-10">
      <Breadcrumbs items={[{ label: level.name, to: `/niveau/${level.slug}` }, { label: subject.name, to: `/niveau/${level.slug}/${subject.slug}` }, { label: data.chapter.title }]} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{data.title}</h1>
          {data.description && <p className="text-sm text-muted">{data.description}</p>}
        </div>
        <div className="flex items-center gap-3 text-sm">
          {data.isPremium && <PremiumBadge />}
          <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-slate-700"><Clock className="h-3.5 w-3.5" /> {fmt(elapsed)}</span>
        </div>
      </div>
      <div className="mb-2 flex justify-between text-xs text-muted">
        <span>Question {current + 1} / {data.questions.length}</span>
        <span>{answered} répondue{answered > 1 ? "s" : ""}</span>
      </div>
      <ProgressBar value={((current + 1) / data.questions.length) * 100} className="mb-6" />

      <div className="card p-6 sm:p-8 fade-up" key={q.id}>
        <Markdown content={q.text} className="!text-lg font-semibold" />
        <div className="mt-5 space-y-2.5">
          {q.options.map((o, i) => {
            const selected = answers[q.id] === o.id;
            return (
              <button
                key={o.id}
                aria-pressed={selected}
                onClick={() => setAnswers({ ...answers, [q.id]: o.id })}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${selected ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>{String.fromCharCode(65 + i)}</span>
                <Markdown content={o.text} className="!text-[15px]" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button className="btn-ghost" disabled={current === 0} onClick={() => setCurrent(current - 1)}><ChevronLeft className="h-4 w-4" /> Précédent</button>
        <div className="flex gap-1.5">
          {data.questions.map((qq, i) => (
            <button key={qq.id} onClick={() => setCurrent(i)} className="grid h-7 w-5 place-items-center rounded-full" aria-label={`Question ${i + 1}${answers[qq.id] ? " (répondue)" : ""}`} aria-current={i === current ? "step" : undefined}>
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${i === current ? "bg-brand-600" : answers[qq.id] ? "bg-brand-300" : "bg-slate-200"}`} />
            </button>
          ))}
        </div>
        {current < data.questions.length - 1 ? (
          <button className="btn-primary" onClick={() => setCurrent(current + 1)}>Suivant <ChevronRight className="h-4 w-4" /></button>
        ) : (
          <button className="btn-accent" disabled={busy || answered === 0} onClick={submit}>{busy ? "Envoi…" : "Valider mes réponses"}</button>
        )}
      </div>
      {!user && <p className="mt-4 text-center text-sm text-muted">Connectez-vous pour enregistrer votre score et suivre votre progression.</p>}
    </div>
  );
}
