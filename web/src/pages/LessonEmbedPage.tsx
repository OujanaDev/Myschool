import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, Crown, Download, Lock, PlayCircle, Video } from "lucide-react";
import Markdown from "../components/Markdown";
import { PremiumBadge, TypeBadge } from "../components/ui";
import type { LessonType } from "../lib/types";

/** The lesson as the mobile app hands it over (it fetched it with the student's own session). */
export type EmbeddedLesson = {
  title: string;
  type: LessonType;
  isPremium: boolean;
  durationMin?: number;
  context: string;
  content: string;
  locked: boolean;
  videoUrl?: string;
  fileUrl?: string;
  completed?: boolean;
  bookmarked?: boolean;
  prev?: { id: string; title: string } | null;
  next?: { id: string; title: string } | null;
  quizzes: { id: string; title: string; locked: boolean }[];
};

/** What a tap asks the app to do: the page itself never navigates nor calls the API. "ready": send me the lesson. */
type AppMessage =
  | { type: "ready" }
  | { type: "navigate"; path: string }
  | { type: "open"; url: string }
  | { type: "toggleCompleted" }
  | { type: "toggleBookmark" };

declare global {
  interface Window {
    __MYSCHOOL_LESSON__?: EmbeddedLesson;
    __myschoolRender?: (lesson: EmbeddedLesson) => void;
    ReactNativeWebView?: { postMessage: (data: string) => void };
  }
}

function send(message: AppMessage) {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  else if (window.parent !== window) window.parent.postMessage({ source: "myschool-embed", ...message }, "*");
}

// In the browser build of the app (development), the lesson comes from the parent page, which must be local.
const fromDevParent = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

/**
 * A lesson alone, without the site chrome: /embed/lecon. The mobile app shows its lessons through this page in a
 * web view, so that formulas (KaTeX), figures and labs look exactly as on the site. The app injects the lesson as
 * window.__MYSCHOOL_LESSON__ and calls window.__myschoolRender after a change; taps go back to it as messages.
 * This page is loaded lazily, after the frame's load event: once mounted it says "ready" and the app answers
 * with the current lesson.
 */
export default function LessonEmbedPage() {
  const [lesson, setLesson] = useState<EmbeddedLesson | null>(() => window.__MYSCHOOL_LESSON__ ?? null);

  useEffect(() => {
    window.__myschoolRender = setLesson;
    const onMessage = (e: MessageEvent) => {
      if (fromDevParent(e.origin) && e.data?.type === "myschool:lesson") setLesson(e.data.lesson);
    };
    window.addEventListener("message", onMessage);
    send({ type: "ready" });
    return () => {
      window.removeEventListener("message", onMessage);
      delete window.__myschoolRender;
    };
  }, []);

  useEffect(() => {
    if (lesson) document.title = lesson.title;
  }, [lesson?.title]);

  if (!lesson) return <main className="min-h-screen bg-white" />;

  return (
    <main className="min-h-screen bg-surface px-4 py-5">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TypeBadge type={lesson.type} />
          {lesson.isPremium && <PremiumBadge />}
          {lesson.durationMin ? (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3 w-3" /> {lesson.durationMin} min
            </span>
          ) : null}
        </div>
        <p className="mb-4 text-xs text-muted">{lesson.context}</p>

        {!lesson.locked && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => send({ type: "toggleCompleted" })}
              className={`flex-1 ${lesson.completed ? "btn bg-brand-100 text-brand-800" : "btn-primary"}`}
            >
              <CheckCircle2 className="h-4 w-4" /> {lesson.completed ? "Terminé ✓" : "Marquer comme terminé"}
            </button>
            <button
              onClick={() => send({ type: "toggleBookmark" })}
              className="btn-outline px-3"
              aria-label={lesson.bookmarked ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              {lesson.bookmarked ? <BookmarkCheck className="h-4 w-4 text-brand-600" /> : <Bookmark className="h-4 w-4" />}
            </button>
          </div>
        )}

        <div className="card p-5">
          {!lesson.locked && (lesson.videoUrl || lesson.fileUrl) ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {lesson.videoUrl && (
                <button onClick={() => send({ type: "open", url: lesson.videoUrl! })} className="btn-outline">
                  <Video className="h-4 w-4" /> Regarder la vidéo
                </button>
              )}
              {lesson.fileUrl && (
                <button onClick={() => send({ type: "open", url: lesson.fileUrl! })} className="btn-outline">
                  <Download className="h-4 w-4" /> Télécharger le document
                </button>
              )}
            </div>
          ) : null}
          {lesson.locked ? (
            <>
              <div className="relative max-h-64 overflow-hidden">
                <Markdown content={lesson.content} />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-white to-transparent" />
              </div>
              <div className="mt-4 rounded-2xl border border-accent-500/40 bg-linear-to-br from-amber-50 to-white p-6 text-center">
                <Lock className="mx-auto h-7 w-7 text-accent-600" />
                <p className="mt-3 font-bold text-ink">Contenu réservé aux membres Premium</p>
                <p className="mt-1 text-sm text-muted">Passez à Premium pour lire la suite de ce cours.</p>
                <button onClick={() => send({ type: "navigate", path: "/premium" })} className="btn-accent mt-4">
                  <Crown className="h-4 w-4" /> Passer à Premium
                </button>
              </div>
            </>
          ) : (
            <Markdown content={lesson.content} />
          )}
        </div>

        {lesson.prev || lesson.next ? (
          <div className="mt-5 flex items-center justify-between gap-3">
            {lesson.prev ? (
              <button onClick={() => send({ type: "navigate", path: `/lesson/${lesson.prev!.id}` })} className="btn-ghost max-w-[48%]">
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">{lesson.prev.title}</span>
              </button>
            ) : (
              <span />
            )}
            {lesson.next ? (
              <button onClick={() => send({ type: "navigate", path: `/lesson/${lesson.next!.id}` })} className="btn-ghost max-w-[48%]">
                <span className="truncate">{lesson.next.title}</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            ) : (
              <span />
            )}
          </div>
        ) : null}

        {lesson.quizzes.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-sm font-semibold text-ink">Tester mes connaissances</p>
            {lesson.quizzes.map((q) => (
              <button
                key={q.id}
                onClick={() => send({ type: "navigate", path: q.locked ? "/premium" : `/quiz/${q.id}` })}
                className="card flex w-full items-center gap-3 border-amber-200 bg-amber-50 p-4 text-left hover:bg-amber-100"
              >
                <PlayCircle className="h-7 w-7 shrink-0 text-amber-600" />
                <span className="font-semibold text-ink">{q.title}</span>
                {q.locked && <Lock className="ml-auto h-4 w-4 text-accent-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
