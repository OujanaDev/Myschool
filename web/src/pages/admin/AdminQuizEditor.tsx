import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, Plus, Save, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/hooks";
import Markdown from "../../components/Markdown";
import { ErrorBox, PageHeader, Spinner } from "../../components/ui";
import { ChapterPicker } from "./ChapterPicker";

type QForm = { text: string; explanation: string; options: { text: string; isCorrect: boolean }[] };
type QuizFull = {
  id: string; chapterId: string; title: string; description: string; durationMin: number; isPremium: boolean; isPublished: boolean; order: number;
  chapter: { title: string; levelSubject: { id: string; level: { name: string }; subject: { name: string } } };
  questions: { text: string; explanation: string; options: { text: string; isCorrect: boolean }[] }[];
};

const newQuestion = (): QForm => ({ text: "", explanation: "", options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }] });

export default function AdminQuizEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id;
  const { data, loading, error } = useFetch<QuizFull>(isNew ? null : `/admin/quizzes/${id}`);
  const [form, setForm] = useState({ chapterId: params.get("chapterId") ?? "", title: "", description: "", durationMin: 10, isPremium: false, isPublished: true, order: 0 });
  const [questions, setQuestions] = useState<QForm[]>([newQuestion()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      const { id: _i, chapter: _c, questions: qs, ...rest } = data;
      setForm(rest);
      setQuestions(qs.length ? qs.map((q) => ({ text: q.text, explanation: q.explanation, options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) })) : [newQuestion()]);
    }
  }, [data]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;

  const updateQ = (i: number, patch: Partial<QForm>) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const copy = [...questions];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setQuestions(copy);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (!form.chapterId) throw new Error("Choisissez un chapitre");
      const clean = questions
        .map((q) => ({ ...q, options: q.options.filter((o) => o.text.trim()) }))
        .filter((q) => q.text.trim());
      for (const [i, q] of clean.entries()) {
        if (q.options.length < 2) throw new Error(`Question ${i + 1} : au moins 2 réponses sont nécessaires`);
        if (!q.options.some((o) => o.isCorrect)) throw new Error(`Question ${i + 1} : cochez la bonne réponse`);
      }
      const payload = { ...form, questions: clean };
      if (isNew) {
        const created = await api.post<QuizFull>("/admin/quizzes", payload);
        navigate(`/admin/qcm/${created.id}`, { replace: true });
      } else {
        await api.put(`/admin/quizzes/${id}`, payload);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!confirm("Supprimer ce QCM ?")) return;
    await api.delete(`/admin/quizzes/${id}`);
    navigate(data ? `/admin/programme/${data.chapter.levelSubject.id}` : "/admin/qcm");
  };

  return (
    <form onSubmit={save}>
      <PageHeader
        eyebrow={data ? `${data.chapter.levelSubject.level.name} · ${data.chapter.levelSubject.subject.name} · ${data.chapter.title}` : "Nouveau QCM"}
        title={isNew ? "Nouveau QCM" : "Modifier le QCM"}
        actions={
          <>
            {!isNew && <Link to={`/qcm/${id}`} target="_blank" className="btn-outline"><Eye className="h-4 w-4" /> Voir</Link>}
            {!isNew && <button aria-label="Supprimer" type="button" className="btn-danger" onClick={del}><Trash2 className="h-4 w-4" /></button>}
            <button className="btn-primary" disabled={busy}><Save className="h-4 w-4" /> {saved ? "Enregistré ✓" : busy ? "Enregistrement…" : "Enregistrer"}</button>
          </>
        }
      />
      {err && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="card space-y-4 p-5">
            <div><label className="label" htmlFor="admin-quiz-editor-103">Titre</label><input id="admin-quiz-editor-103" className="input !text-base font-semibold" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. : QCM : théorème de Thalès" /></div>
            <div><label className="label" htmlFor="admin-quiz-editor-104">Description</label><input id="admin-quiz-editor-104" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>

          {questions.map((q, i) => (
            <div key={i} className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">Q{i + 1}</span>
                <span className="flex-1" />
                <button aria-label="Aperçu de la question" type="button" className="btn-ghost !p-2" onClick={() => setPreviewIdx(previewIdx === i ? null : i)} title="Aperçu"><Eye className="h-4 w-4" /></button>
                <button aria-label="Monter la question" type="button" className="btn-ghost !p-2" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></button>
                <button aria-label="Descendre la question" type="button" className="btn-ghost !p-2" onClick={() => move(i, 1)} disabled={i === questions.length - 1}><ArrowDown className="h-4 w-4" /></button>
                <button aria-label="Supprimer la question" type="button" className="btn-ghost !p-2 text-red-600" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
              </div>
              {previewIdx === i ? (
                <div className="rounded-xl bg-slate-50 p-4">
                  <Markdown content={q.text || "*Énoncé vide*"} />
                  <ul className="mt-2 space-y-1">
                    {q.options.map((o, k) => <li key={k} className={`rounded-lg px-3 py-1.5 text-sm ${o.isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-white"}`}><Markdown content={o.text || "—"} className="!text-sm" /></li>)}
                  </ul>
                </div>
              ) : (
                <>
                  <textarea className="input min-h-[70px] font-mono text-sm" placeholder="Énoncé de la question (Markdown + LaTeX : $x^2$)" value={q.text} onChange={(e) => updateQ(i, { text: e.target.value })} />
                  <div className="mt-3 space-y-2">
                    {q.options.map((o, k) => (
                      <div key={k} className="flex items-center gap-2">
                        <input type="radio" name={`correct-${i}`} className="h-4 w-4 accent-brand-600" checked={o.isCorrect} onChange={() => updateQ(i, { options: q.options.map((x, m) => ({ ...x, isCorrect: m === k })) })} title="Bonne réponse" />
                        <input className="input" placeholder={`Réponse ${String.fromCharCode(65 + k)}`} value={o.text} onChange={(e) => updateQ(i, { options: q.options.map((x, m) => (m === k ? { ...x, text: e.target.value } : x)) })} />
                        <button aria-label="Supprimer" type="button" className="btn-ghost !p-2 text-slate-400" onClick={() => updateQ(i, { options: q.options.filter((_, m) => m !== k) })} disabled={q.options.length <= 2}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    {q.options.length < 6 && <button type="button" className="btn-ghost !py-1.5 !text-xs" onClick={() => updateQ(i, { options: [...q.options, { text: "", isCorrect: false }] })}><Plus className="h-3.5 w-3.5" /> Ajouter une réponse</button>}
                  </div>
                  <input className="input mt-3" placeholder="Explication affichée après la réponse (optionnel)" value={q.explanation} onChange={(e) => updateQ(i, { explanation: e.target.value })} />
                </>
              )}
            </div>
          ))}
          <button type="button" className="btn-outline w-full" onClick={() => setQuestions([...questions, newQuestion()])}><Plus className="h-4 w-4" /> Ajouter une question</button>
        </div>

        <div className="card h-fit space-y-4 p-5">
          <div><span className="label">Chapitre</span><ChapterPicker value={form.chapterId} onChange={(chapterId) => setForm({ ...form, chapterId })} /></div>
          <div><label className="label" htmlFor="admin-quiz-editor-147">Durée (min)</label><input id="admin-quiz-editor-147" className="input" type="number" min={1} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} /></div>
          <div><label className="label" htmlFor="admin-quiz-editor-148">Ordre</label><input id="admin-quiz-editor-148" className="input" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></div>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} /> QCM Premium</label>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Publié</label>
          <p className="text-xs text-muted">{questions.length} question{questions.length > 1 ? "s" : ""}</p>
        </div>
      </div>
    </form>
  );
}
