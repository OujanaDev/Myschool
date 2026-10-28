import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, Save, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/hooks";
import type { LessonType } from "../../lib/types";
import Markdown from "../../components/Markdown";
import { ErrorBox, LESSON_TYPES, PageHeader, Spinner } from "../../components/ui";
import { ChapterPicker } from "./ChapterPicker";

type LessonFull = {
  id: string; chapterId: string; title: string; type: LessonType; content: string; videoUrl: string; fileUrl: string;
  durationMin: number; isPremium: boolean; isPublished: boolean; order: number;
  chapter: { title: string; levelSubject: { id: string; level: { name: string }; subject: { name: string } } };
};

const TEMPLATE = `# Titre du cours

## Objectifs
- Objectif 1
- Objectif 2

## 1. Définition
Texte du cours. Formule en ligne : $a^2 + b^2 = c^2$.

Formule centrée :
$$\\lim_{x \\to +\\infty} \\frac{1}{x} = 0$$

## 2. Exemple
> **Remarque.** Utilisez les citations pour les points importants.

| Colonne | Valeur |
|---|---|
| A | 1 |
`;

export default function AdminLessonEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id;
  const { data, loading, error } = useFetch<LessonFull>(isNew ? null : `/admin/lessons/${id}`);
  const [form, setForm] = useState({
    chapterId: params.get("chapterId") ?? "",
    title: "",
    type: "COURSE" as LessonType,
    content: TEMPLATE,
    videoUrl: "",
    fileUrl: "",
    durationMin: 20,
    isPremium: false,
    isPublished: true,
    order: 0,
  });
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      const { id: _i, chapter: _c, ...rest } = data;
      setForm(rest);
    }
  }, [data]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (!form.chapterId) throw new Error("Choisissez un chapitre");
      if (isNew) {
        const created = await api.post<LessonFull>("/admin/lessons", form);
        navigate(`/admin/cours/${created.id}`, { replace: true });
      } else {
        await api.put(`/admin/lessons/${id}`, form);
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
    if (!confirm("Supprimer ce cours ?")) return;
    await api.delete(`/admin/lessons/${id}`);
    navigate(data ? `/admin/programme/${data.chapter.levelSubject.id}` : "/admin/cours");
  };

  return (
    <form onSubmit={save}>
      <PageHeader
        eyebrow={data ? `${data.chapter.levelSubject.level.name} · ${data.chapter.levelSubject.subject.name} · ${data.chapter.title}` : "Nouveau contenu"}
        title={isNew ? "Nouveau cours / exercice" : "Modifier le cours"}
        actions={
          <>
            {!isNew && <Link to={`/cours/${id}`} target="_blank" className="btn-outline"><Eye className="h-4 w-4" /> Voir</Link>}
            {!isNew && <button aria-label="Supprimer" type="button" className="btn-danger" onClick={del}><Trash2 className="h-4 w-4" /></button>}
            <button className="btn-primary" disabled={busy}><Save className="h-4 w-4" /> {saved ? "Enregistré ✓" : busy ? "Enregistrement…" : "Enregistrer"}</button>
          </>
        }
      />
      {err && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="card p-5">
            <label className="label" htmlFor="admin-lesson-editor-113">Titre</label>
            <input id="admin-lesson-editor-113" className="input !text-base font-semibold" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. : Cours : théorème de Thalès" />
          </div>
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2">
              <span className="text-sm font-semibold text-slate-700">Contenu (Markdown + LaTeX)</span>
              <div className="flex gap-1 rounded-lg bg-slate-200/60 p-0.5">
                <button type="button" className={`rounded-md px-3 py-1 text-xs font-semibold ${!preview ? "bg-white shadow-sm" : "text-slate-600"}`} onClick={() => setPreview(false)}>Éditer</button>
                <button type="button" className={`rounded-md px-3 py-1 text-xs font-semibold ${preview ? "bg-white shadow-sm" : "text-slate-600"}`} onClick={() => setPreview(true)}>Aperçu</button>
              </div>
            </div>
            {preview ? (
              <div className="min-h-[480px] p-6"><Markdown content={form.content} /></div>
            ) : (
              <textarea className="min-h-[480px] w-full resize-y p-4 font-mono text-sm outline-none" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} spellCheck={false} />
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card space-y-4 p-5">
            <div>
              <span className="label">Chapitre</span>
              <ChapterPicker value={form.chapterId} onChange={(chapterId) => setForm({ ...form, chapterId })} />
            </div>
            <div>
              <label className="label" htmlFor="admin-lesson-editor-138">Type</label>
              <select id="admin-lesson-editor-138" className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LessonType })}>
                {(Object.keys(LESSON_TYPES) as LessonType[]).map((t) => <option key={t} value={t}>{LESSON_TYPES[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="admin-lesson-editor-144">Durée estimée (min)</label>
              <input id="admin-lesson-editor-144" className="input" type="number" min={1} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label" htmlFor="admin-lesson-editor-148">Ordre dans le chapitre</label>
              <input id="admin-lesson-editor-148" className="input" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} /> Contenu Premium</label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Publié</label>
          </div>
          <div className="card space-y-4 p-5">
            <div>
              <label className="label" htmlFor="admin-lesson-editor-156">Vidéo (YouTube ou URL)</label>
              <input id="admin-lesson-editor-156" className="input" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://youtu.be/…" />
            </div>
            <div>
              <label className="label" htmlFor="admin-lesson-editor-160">Fichier PDF (URL)</label>
              <input id="admin-lesson-editor-160" className="input" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://…/document.pdf" />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
