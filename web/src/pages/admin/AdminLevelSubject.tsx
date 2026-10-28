import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { useFetch } from "../../lib/hooks";
import type { Level, LessonLite, Subject } from "../../lib/types";
import { api } from "../../lib/api";
import { Breadcrumbs, ErrorBox, PageHeader, PremiumBadge, Spinner, SubjectIcon, TypeBadge } from "../../components/ui";

type Data = {
  id: string;
  level: Level & { cycle: { name: string } };
  subject: Subject;
  chapters: {
    id: string;
    title: string;
    semester: number;
    order: number;
    lessons: (LessonLite & { isPublished: boolean })[];
    quizzes: { id: string; title: string; isPremium: boolean; isPublished: boolean; _count: { questions: number } }[];
  }[];
};

export default function AdminLevelSubject() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch<Data>(`/admin/level-subjects/${id}`);
  const [form, setForm] = useState<{ id?: string; title: string; semester: number; order: number } | null>(null);
  const [err, setErr] = useState("");

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? "Erreur"} retry={reload} />;

  const saveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setErr("");
    try {
      const { id: cid, ...b } = form;
      if (cid) await api.put(`/admin/chapters/${cid}`, b);
      else await api.post("/admin/chapters", { ...b, levelSubjectId: data.id });
      setForm(null);
      reload();
    } catch (e: any) {
      setErr(e.message);
    }
  };
  const delChapter = async (cid: string, title: string) => {
    if (!confirm(`Supprimer le chapitre « ${title} » et tout son contenu ?`)) return;
    await api.delete(`/admin/chapters/${cid}`);
    reload();
  };
  const delLesson = async (lid: string, title: string) => {
    if (!confirm(`Supprimer « ${title} » ?`)) return;
    await api.delete(`/admin/lessons/${lid}`);
    reload();
  };
  const delQuiz = async (qid: string, title: string) => {
    if (!confirm(`Supprimer le QCM « ${title} » ?`)) return;
    await api.delete(`/admin/quizzes/${qid}`);
    reload();
  };
  const togglePublish = async (kind: "lessons" | "quizzes", itemId: string, current: boolean) => {
    await api.put(`/admin/${kind}/${itemId}`, { isPublished: !current });
    reload();
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Cycles & niveaux", to: "/admin/niveaux" }, { label: data.level.name }, { label: data.subject.name }]} />
      <PageHeader
        eyebrow={data.level.name}
        title={<span className="flex items-center gap-3"><SubjectIcon icon={data.subject.icon} color={data.subject.color} className="h-6 w-6" boxClass="h-12 w-12" /> {data.subject.name}</span>}
        subtitle={<>{data.chapters.length} chapitres · <Link to={`/niveau/${data.level.slug}/${data.subject.slug}`} className="text-brand-700">voir côté élève</Link></>}
        actions={<button className="btn-primary" onClick={() => setForm({ title: "", semester: 1, order: data.chapters.length })}><Plus className="h-4 w-4" /> Chapitre</button>}
      />

      {form && (
        <form onSubmit={saveChapter} className="card mb-6 grid gap-4 p-6 md:grid-cols-4">
          <div className="flex items-center justify-between md:col-span-4">
            <h3 className="font-bold text-ink">{form.id ? "Modifier le chapitre" : "Nouveau chapitre"}</h3>
            <button type="button" className="btn-ghost !p-2" onClick={() => setForm(null)}><X className="h-4 w-4" /></button>
          </div>
          <div className="md:col-span-2"><label className="label" htmlFor="admin-level-subject-82">Titre</label><input id="admin-level-subject-82" className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label" htmlFor="admin-level-subject-83">Semestre</label><select id="admin-level-subject-83" className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}><option value={1}>Semestre 1</option><option value={2}>Semestre 2</option></select></div>
          <div><label className="label" htmlFor="admin-level-subject-84">Ordre</label><input id="admin-level-subject-84" className="input" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></div>
          {err && <p className="text-sm text-red-600 md:col-span-4">{err}</p>}
          <div className="md:col-span-4"><button className="btn-primary">Enregistrer</button></div>
        </form>
      )}

      <div className="space-y-4">
        {data.chapters.map((c) => (
          <div key={c.id} className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
              <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">S{c.semester}</span>
              <h3 className="flex-1 font-semibold text-ink">{c.title}</h3>
              <Link to={`/admin/cours/nouveau?chapterId=${c.id}`} className="btn-outline !py-1.5 !text-xs"><Plus className="h-3.5 w-3.5" /> Cours</Link>
              <Link to={`/admin/qcm/nouveau?chapterId=${c.id}`} className="btn-outline !py-1.5 !text-xs"><Plus className="h-3.5 w-3.5" /> QCM</Link>
              <button aria-label="Modifier" className="btn-ghost !p-2" onClick={() => setForm({ id: c.id, title: c.title, semester: c.semester, order: c.order })}><Pencil className="h-4 w-4" /></button>
              <button aria-label="Supprimer" className="btn-ghost !p-2 text-red-600" onClick={() => delChapter(c.id, c.title)}><Trash2 className="h-4 w-4" /></button>
            </div>
            <ul className="divide-y divide-slate-100">
              {c.lessons.map((l) => (
                <li key={l.id} className={`flex items-center gap-3 px-5 py-2.5 ${!l.isPublished ? "opacity-50" : ""}`}>
                  <TypeBadge type={l.type} />
                  <Link to={`/admin/cours/${l.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-brand-700">{l.title}</Link>
                  {l.isPremium && <PremiumBadge small />}
                  <span className="text-xs text-muted">{l.views} vues</span>
                  <button aria-label={l.isPublished ? "Dépublier" : "Publier"} className="btn-ghost !p-2" title={l.isPublished ? "Dépublier" : "Publier"} onClick={() => togglePublish("lessons", l.id, l.isPublished)}>{l.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                  <button aria-label="Supprimer" className="btn-ghost !p-2 text-red-600" onClick={() => delLesson(l.id, l.title)}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
              {c.quizzes.map((q) => (
                <li key={q.id} className={`flex items-center gap-3 bg-amber-50/30 px-5 py-2.5 ${!q.isPublished ? "opacity-50" : ""}`}>
                  <span className="badge bg-amber-100 text-amber-800">QCM</span>
                  <Link to={`/admin/qcm/${q.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-brand-700">{q.title}</Link>
                  {q.isPremium && <PremiumBadge small />}
                  <span className="text-xs text-muted">{q._count.questions} questions</span>
                  <button aria-label={q.isPublished ? "Dépublier" : "Publier"} className="btn-ghost !p-2" onClick={() => togglePublish("quizzes", q.id, q.isPublished)}>{q.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                  <button aria-label="Supprimer" className="btn-ghost !p-2 text-red-600" onClick={() => delQuiz(q.id, q.title)}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
              {c.lessons.length === 0 && c.quizzes.length === 0 && <li className="px-5 py-3 text-sm text-muted">Aucun contenu. Ajoutez un cours ou un QCM.</li>}
            </ul>
          </div>
        ))}
        {data.chapters.length === 0 && <div className="card p-8 text-center text-sm text-muted">Aucun chapitre. Commencez par en créer un.</div>}
      </div>
    </div>
  );
}
