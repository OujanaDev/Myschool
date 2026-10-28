import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Crown, Save } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useFetch } from "../lib/hooks";
import type { Cycle, LessonLite, User } from "../lib/types";
import { api } from "../lib/api";
import { PageHeader, PremiumBadge, SubjectIcon, TypeBadge } from "../components/ui";

type BookmarkItem = { id: string; lesson: LessonLite & { chapter: { title: string; levelSubject: { level: { name: string }; subject: { name: string; icon: string; color: string } } } } };

export default function ProfilePage() {
  const { user, setUser, isPremium } = useAuth();
  const { data: cycles } = useFetch<Cycle[]>("/cycles");
  const { data: bookmarks } = useFetch<BookmarkItem[]>("/me/bookmarks");
  const [name, setName] = useState(user?.name ?? "");
  const [levelId, setLevelId] = useState(user?.levelId ?? "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setLevelId(user?.levelId ?? "");
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setUser(await api.patch<User>("/auth/me", { name, levelId: levelId || null }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-x max-w-4xl py-10">
      <PageHeader title="Mon profil" subtitle={user?.email} />
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <form onSubmit={save} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="profile-page-44">Nom complet</label>
            <input id="profile-page-44" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <label className="label" htmlFor="profile-page-48">Mon niveau</label>
            <select id="profile-page-48" className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">Aucun</option>
              {(cycles ?? []).map((c) => (
                <optgroup key={c.id} label={c.name}>
                  {c.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">Le niveau permet de personnaliser vos recommandations et votre plan d'étude.</p>
          </div>
          <button className="btn-primary" disabled={busy}><Save className="h-4 w-4" /> {saved ? "Enregistré ✓" : "Enregistrer"}</button>
        </form>
        <div className="card p-6">
          <h3 className="font-bold text-ink">Abonnement</h3>
          <div className="mt-3">
            {isPremium ? (
              <>
                <PremiumBadge />
                {user?.premiumUntil && <p className="mt-2 text-sm text-muted">Actif jusqu'au {new Date(user.premiumUntil).toLocaleDateString("fr-MA")}</p>}
              </>
            ) : (
              <>
                <span className="badge bg-slate-100 text-slate-700">Gratuit</span>
                <Link to="/premium" className="btn-accent mt-4 w-full"><Crown className="h-4 w-4" /> Passer à Premium</Link>
              </>
            )}
          </div>
          <p className="mt-4 text-xs text-muted">Compte créé le {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-MA") : "—"}</p>
        </div>
      </div>

      <h2 className="mb-4 mt-10 flex items-center gap-2 text-xl font-bold text-ink"><Bookmark className="h-5 w-5 text-brand-600" /> Mes favoris</h2>
      {!bookmarks || bookmarks.length === 0 ? (
        <p className="text-sm text-muted">Aucun favori pour l'instant. Ajoutez des cours à vos favoris pour les retrouver ici.</p>
      ) : (
        <div className="card divide-y divide-slate-100">
          {bookmarks.map((b) => {
            const s = b.lesson.chapter.levelSubject.subject;
            return (
              <Link key={b.id} to={`/cours/${b.lesson.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <SubjectIcon icon={s.icon} color={s.color} className="h-4 w-4" boxClass="h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{b.lesson.title}</div>
                  <div className="truncate text-xs text-muted">{b.lesson.chapter.levelSubject.level.name} · {s.name} · {b.lesson.chapter.title}</div>
                </div>
                <TypeBadge type={b.lesson.type} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
