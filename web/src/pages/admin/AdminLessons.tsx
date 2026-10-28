import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useDebounce, useFetch } from "../../lib/hooks";
import type { LessonLite } from "../../lib/types";
import { ErrorBox, PageHeader, PremiumBadge, Spinner, TypeBadge } from "../../components/ui";

type Row = LessonLite & { isPublished: boolean; updatedAt: string; chapter: { title: string; levelSubject: { level: { name: string }; subject: { name: string } } } };

export default function AdminLessons() {
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 300);
  const { data, loading, error, reload } = useFetch<Row[]>(`/admin/lessons?q=${encodeURIComponent(dq)}`);
  return (
    <div>
      <PageHeader title="Cours & exercices" subtitle="Les 100 derniers contenus modifiés. Utilisez la recherche pour en trouver d'autres." actions={<Link to="/admin/cours/nouveau" className="btn-primary"><Plus className="h-4 w-4" /> Nouveau</Link>} />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" type="search" aria-label="Rechercher par titre…" placeholder="Rechercher par titre…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading && <Spinner />}
      {error && <ErrorBox message={error} retry={reload} />}
      {data && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Titre</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Niveau · Matière</th><th className="px-4 py-3">Vues</th><th className="px-4 py-3">Statut</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5"><Link to={`/admin/cours/${l.id}`} className="font-medium text-ink hover:text-brand-700">{l.title}</Link>{l.isPremium && <span className="ml-2"><PremiumBadge small /></span>}<div className="text-xs text-muted">{l.chapter.title}</div></td>
                  <td className="px-4 py-2.5"><TypeBadge type={l.type} /></td>
                  <td className="px-4 py-2.5 text-slate-600">{l.chapter.levelSubject.level.name}<br /><span className="text-xs text-muted">{l.chapter.levelSubject.subject.name}</span></td>
                  <td className="px-4 py-2.5 text-slate-600">{l.views}</td>
                  <td className="px-4 py-2.5"><span className={`badge ${l.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{l.isPublished ? "Publié" : "Brouillon"}</span></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Aucun résultat.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
