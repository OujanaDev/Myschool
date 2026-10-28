import { Link, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, ClipboardList } from "lucide-react";
import { useFetch } from "../lib/hooks";
import type { Level, Subject } from "../lib/types";
import { Breadcrumbs, EmptyState, ErrorBox, PageHeader, Spinner, SubjectIcon } from "../components/ui";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

type LevelData = Level & { cycle: { name: string; slug: string }; subjects: { id: string; subject: Subject; chapters: number; lessons: number; quizzes: number }[] };

export default function LevelPage() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useFetch<LevelData>(`/levels/${slug}`);
  const { user, setUser } = useAuth();

  if (loading) return <Spinner />;
  if (error || !data) return <div className="container-x py-10"><ErrorBox message={error ?? "Erreur"} retry={reload} /></div>;

  const isMine = user?.levelId === data.id;
  const setAsMine = async () => {
    const u = await api.patch<any>("/auth/me", { levelId: data.id });
    setUser(u);
  };

  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Explorer", to: "/explorer" }, { label: data.cycle.name, to: `/explorer#${data.cycle.slug}` }, { label: data.name }]} />
      <PageHeader
        eyebrow={data.track || data.cycle.name}
        title={data.name}
        subtitle={data.description}
        actions={
          user &&
          (isMine ? (
            <span className="badge bg-brand-100 text-brand-800 !px-3 !py-1.5">Votre niveau actuel</span>
          ) : (
            <button className="btn-outline" onClick={setAsMine}>
              Définir comme mon niveau
            </button>
          ))
        }
      />
      {data.subjects.length === 0 ? (
        <EmptyState title="Aucune matière pour ce niveau" text="Le contenu sera ajouté prochainement." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.subjects.map((s) => (
            <Link key={s.id} to={`/niveau/${data.slug}/${s.subject.slug}`} className="card group p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <SubjectIcon icon={s.subject.icon} color={s.subject.color} className="h-6 w-6" boxClass="h-12 w-12" />
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-brand-600" />
              </div>
              <h3 className="mt-4 font-bold text-ink">{s.subject.name}</h3>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                <span>{s.chapters} chapitres</span>
                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {s.lessons} cours</span>
                <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" /> {s.quizzes} QCM</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
