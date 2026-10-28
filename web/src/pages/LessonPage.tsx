import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bookmark, BookmarkCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, HelpCircle, Lock, PlayCircle } from "lucide-react";
import { useFetch } from "../lib/hooks";
import type { Lesson } from "../lib/types";
import { Breadcrumbs, ErrorBox, Paywall, PremiumBadge, Spinner, TypeBadge } from "../components/ui";
import Markdown from "../components/Markdown";
import LessonToc from "../components/LessonToc";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

function toEmbed(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

export default function LessonPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useFetch<Lesson>(`/lessons/${id}`);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (error || !data) return <div className="container-x py-10"><ErrorBox message={error ?? "Erreur"} retry={reload} /></div>;

  const { level, subject } = data.chapter.levelSubject;
  const siblings = data.chapter.lessons;
  const idx = siblings.findIndex((l) => l.id === data.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const toggleComplete = async () => {
    setBusy(true);
    try {
      if (data.completed) await api.delete(`/me/progress/${data.id}`);
      else await api.post(`/me/progress/${data.id}`);
      setData({ ...data, completed: !data.completed });
    } finally {
      setBusy(false);
    }
  };
  const toggleBookmark = async () => {
    const r = await api.post<{ bookmarked: boolean }>(`/me/bookmarks/${data.id}`);
    setData({ ...data, bookmarked: r.bookmarked });
  };

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: level.name, to: `/niveau/${level.slug}` }, { label: subject.name, to: `/niveau/${level.slug}/${subject.slug}` }, { label: data.chapter.title }]} />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <article className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <TypeBadge type={data.type} />
            {data.isPremium && <PremiumBadge />}
            <span className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" /> {data.durationMin} min</span>
          </div>
          <div className="card p-6 sm:p-10">
            {data.videoUrl && !data.locked && (
              <div className="mb-6 aspect-video overflow-hidden rounded-xl bg-black">
                <iframe src={toEmbed(data.videoUrl)} className="h-full w-full" allowFullScreen title={data.title} />
              </div>
            )}
            {data.fileUrl && !data.locked && (
              <a href={data.fileUrl} target="_blank" rel="noreferrer" className="btn-outline mb-6">
                <Download className="h-4 w-4" /> Télécharger le document
              </a>
            )}
            {data.locked ? (
              <>
                <div className="relative max-h-64 overflow-hidden">
                  <Markdown content={data.content} />
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
                </div>
                <div className="mt-4">
                  <Paywall />
                </div>
              </>
            ) : (
              <Markdown content={data.content} />
            )}
          </div>

          {!data.locked && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {user ? (
                <>
                  <button onClick={toggleComplete} disabled={busy} className={data.completed ? "btn bg-brand-100 text-brand-800" : "btn-primary"}>
                    <CheckCircle2 className="h-4 w-4" /> {data.completed ? "Terminé ✓" : "Marquer comme terminé"}
                  </button>
                  <button onClick={toggleBookmark} className="btn-outline">
                    {data.bookmarked ? <BookmarkCheck className="h-4 w-4 text-brand-600" /> : <Bookmark className="h-4 w-4" />}
                    {data.bookmarked ? "Dans mes favoris" : "Ajouter aux favoris"}
                  </button>
                </>
              ) : (
                <Link to="/connexion" className="btn-outline">Connectez-vous pour suivre votre progression</Link>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
            {prev ? (
              <Link to={`/cours/${prev.id}`} className="btn-ghost max-w-[45%]"><ChevronLeft className="h-4 w-4 shrink-0" /><span className="truncate">{prev.title}</span></Link>
            ) : <span />}
            {next ? (
              <Link to={`/cours/${next.id}`} className="btn-ghost max-w-[45%]"><span className="truncate">{next.title}</span><ChevronRight className="h-4 w-4 shrink-0" /></Link>
            ) : <span />}
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {!data.locked && <LessonToc content={data.content} />}
          {data.chapter.quizzes.length > 0 && (
            <Link to={`/qcm/${data.chapter.quizzes[0].id}`} className="card flex items-center gap-3 border-amber-200 bg-amber-50 p-4 hover:bg-amber-100">
              <PlayCircle className="h-8 w-8 text-amber-600" />
              <div>
                <div className="font-semibold text-ink">Tester mes connaissances</div>
                <div className="text-xs text-muted">QCM du chapitre</div>
              </div>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
