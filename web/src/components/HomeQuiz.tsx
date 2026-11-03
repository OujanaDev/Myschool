import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import type { HomeData } from "../lib/types";
import { useAuth } from "../lib/auth";
import Markdown from "./Markdown";

type Quiz = NonNullable<HomeData["demoQuiz"]>;

// The QCM panel of the home page: a real free quiz, answered on the spot, corrected locally.
export default function HomeQuiz({ quiz }: { quiz: Quiz }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [nudge, setNudge] = useState(false);

  const total = quiz.questions.length;
  const q = quiz.questions[current];
  const correctId = q.options.find((o) => o.isCorrect)?.id;

  const verify = () => {
    if (selected === null) return setNudge(true);
    setAnswered(true);
    if (selected === correctId) setScore((s) => s + 1);
  };
  const next = () => {
    if (current === total - 1) return setDone(true);
    setCurrent((c) => c + 1);
    setSelected(null);
    setAnswered(false);
    setNudge(false);
  };
  const restart = () => {
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setDone(false);
    setNudge(false);
  };

  return (
    <div className="relative z-10 w-full max-w-[400px] rounded-[13px] bg-white p-6 text-ink shadow-[0_25px_50px_rgba(8,70,66,0.33)] lg:w-[385px]">
      <div className="flex justify-between text-[11px] text-muted">
        <span>QCM · {quiz.subject}</span>
        <span>
          Question <b className="text-brand-600">{Math.min(current + 1, total)}</b>/{total}
        </span>
      </div>
      <div className="my-3 mb-6 h-[5px] rounded bg-[#e6eeea]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done ? total : current + 1} aria-label="Progression du QCM">
        <i className="block h-full rounded bg-brand-400 transition-[width] duration-300" style={{ width: `${((done ? total : current + 1) / total) * 100}%` }} />
      </div>

      {done ? (
        <div className="text-center">
          <p className="font-display text-[15px] font-semibold text-muted">Ton score</p>
          <p className="font-display text-[56px] font-bold leading-none text-brand-600">
            {score}
            <span className="text-xl text-muted">/{total}</span>
          </p>
          <p className="mx-auto mt-3 max-w-[280px] text-sm leading-6 text-muted">
            {score === total ? "Sans faute. Continue sur le QCM complet du chapitre." : score >= total / 2 ? "Bien joué. Le QCM complet t'attend pour consolider." : "Chaque erreur corrigée est un point gagné à l'examen. Retente ta chance."}
          </p>
          <div className="mt-5 grid gap-2">
            <Link to={`/qcm/${quiz.id}`} className="btn-primary !rounded-[7px] !py-3 !text-sm">
              Faire le QCM complet <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={restart} className="btn-outline !rounded-[7px] !py-3 !text-sm">
              <RotateCcw className="h-4 w-4" /> Recommencer
            </button>
            {!user && (
              <p className="mt-1 text-xs text-muted">
                <Link to="/inscription" className="font-semibold text-brand-600 hover:underline">Crée ton compte</Link> pour garder tes scores et ta progression.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <Markdown content={q.text} className="font-display text-lg! font-semibold leading-snug! text-ink! [&_p]:my-0!" />
          <div className="my-5 grid gap-2" role="group" aria-label="Réponses">
            {q.options.map((o, i) => {
              const state = answered ? (o.id === correctId ? "correct" : o.id === selected ? "wrong" : "idle") : o.id === selected ? "selected" : "idle";
              const look =
                state === "correct" ? "border-[#3ca876] bg-[#e5f5ea]" : state === "wrong" ? "border-[#dc7474] bg-[#ffeaea]" : state === "selected" ? "border-brand-600 bg-[#ebf7f3]" : "border-[#e1e8e4] bg-white hover:border-brand-600 hover:bg-[#ebf7f3]";
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={answered}
                  aria-pressed={o.id === selected}
                  onClick={() => {
                    setSelected(o.id);
                    setNudge(false);
                  }}
                  className={`flex items-start gap-2 rounded-[7px] border px-3 py-2.5 text-left text-[13px] leading-5 transition-colors disabled:cursor-default ${look}`}
                >
                  <span className="font-bold text-brand-600">{String.fromCharCode(65 + i)}.</span>
                  <Markdown content={o.text} className="text-[13px]! leading-5! text-ink! [&_p]:my-0!" />
                </button>
              );
            })}
          </div>
          {answered && q.explanation && <Markdown content={q.explanation} className="mb-4 rounded-[7px] bg-brand-50 px-3 py-2.5 text-[13px]! leading-5! text-brand-900! [&_p]:my-0!" />}
          <button type="button" onClick={answered ? next : verify} className="btn-primary w-full !rounded-[7px] !py-3 !text-[13px]">
            {answered ? (current === total - 1 ? "Voir mon résultat" : "Question suivante") : nudge ? "Choisis une réponse" : "Vérifier ma réponse"}
          </button>
        </>
      )}
    </div>
  );
}
