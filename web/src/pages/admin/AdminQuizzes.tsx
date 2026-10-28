import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useFetch } from "../../lib/hooks";
import { ErrorBox, PageHeader, PremiumBadge, Spinner } from "../../components/ui";

type Row = {
  id: string; title: string; isPremium: boolean; isPublished: boolean; durationMin: number;
  _count: { questions: number; attempts: number };
  chapter: { title: string; levelSubject: { level: { name: string }; subject: { name: string } } };
};

export default function AdminQuizzes() {
  const { data, loading, error, reload } = useFetch<Row[]>("/admin/quizzes");
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? "Erreur"} retry={reload} />;
  return (
    <div>
      <PageHeader title="QCM" subtitle={`${data.length} QCM`} actions={<Link to="/admin/qcm/nouveau" className="btn-primary"><Plus className="h-4 w-4" /> Nouveau QCM</Link>} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3">Titre</th><th className="px-4 py-3">Niveau · Matière</th><th className="px-4 py-3">Questions</th><th className="px-4 py-3">Tentatives</th><th className="px-4 py-3">Statut</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5"><Link to={`/admin/qcm/${q.id}`} className="font-medium text-ink hover:text-brand-700">{q.title}</Link>{q.isPremium && <span className="ml-2"><PremiumBadge small /></span>}<div className="text-xs text-muted">{q.chapter.title}</div></td>
                <td className="px-4 py-2.5 text-slate-600">{q.chapter.levelSubject.level.name}<br /><span className="text-xs text-muted">{q.chapter.levelSubject.subject.name}</span></td>
                <td className="px-4 py-2.5 text-slate-600">{q._count.questions}</td>
                <td className="px-4 py-2.5 text-slate-600">{q._count.attempts}</td>
                <td className="px-4 py-2.5"><span className={`badge ${q.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{q.isPublished ? "Publié" : "Brouillon"}</span></td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Aucun QCM.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
