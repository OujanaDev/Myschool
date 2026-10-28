import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { useFetch } from "../../lib/hooks";
import type { Level, Subject } from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorBox, PageHeader, Spinner, SubjectIcon } from "../../components/ui";

type AdminCycle = { id: string; name: string; slug: string; description: string; order: number; levels: Level[] };
type AdminLevel = Level & { cycle: AdminCycle; subjects: { id: string; order: number; subject: Subject }[] };

export default function AdminLevels() {
  const cycles = useFetch<AdminCycle[]>("/admin/cycles");
  const levels = useFetch<AdminLevel[]>("/admin/levels");
  const subjects = useFetch<Subject[]>("/admin/subjects");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [cycleForm, setCycleForm] = useState<{ id?: string; name: string; description: string; order: number } | null>(null);
  const [levelForm, setLevelForm] = useState<{ id?: string; cycleId: string; name: string; shortName: string; track: string; description: string; order: number } | null>(null);
  const [err, setErr] = useState("");

  const reloadAll = () => {
    cycles.reload();
    levels.reload();
  };

  if (cycles.loading || levels.loading) return <Spinner />;
  if (cycles.error || levels.error) return <ErrorBox message={cycles.error ?? levels.error ?? "Erreur"} retry={reloadAll} />;

  const saveCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleForm) return;
    setErr("");
    try {
      const { id, ...b } = cycleForm;
      if (id) await api.put(`/admin/cycles/${id}`, b);
      else await api.post("/admin/cycles", b);
      setCycleForm(null);
      reloadAll();
    } catch (e: any) {
      setErr(e.message);
    }
  };
  const saveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm) return;
    setErr("");
    try {
      const { id, ...b } = levelForm;
      if (id) await api.put(`/admin/levels/${id}`, b);
      else await api.post("/admin/levels", b);
      setLevelForm(null);
      reloadAll();
    } catch (e: any) {
      setErr(e.message);
    }
  };
  const del = async (kind: "cycles" | "levels", id: string, label: string) => {
    if (!confirm(`Supprimer « ${label} » et tout son contenu ? Cette action est irréversible.`)) return;
    await api.delete(`/admin/${kind}/${id}`);
    reloadAll();
  };
  const attachSubject = async (levelId: string, subjectId: string) => {
    if (!subjectId) return;
    await api.post(`/admin/levels/${levelId}/subjects`, { subjectId });
    levels.reload();
  };
  const detachSubject = async (lsId: string, label: string) => {
    if (!confirm(`Retirer la matière « ${label} » de ce niveau ? Ses chapitres et cours seront supprimés.`)) return;
    await api.delete(`/admin/level-subjects/${lsId}`);
    levels.reload();
  };

  return (
    <div>
      <PageHeader
        title="Cycles & niveaux"
        subtitle="Organisez la structure : cycle → niveau → matières → chapitres."
        actions={
          <>
            <button className="btn-outline" onClick={() => setCycleForm({ name: "", description: "", order: (cycles.data?.length ?? 0) + 1 })}><Plus className="h-4 w-4" /> Cycle</button>
            <button className="btn-primary" onClick={() => setLevelForm({ cycleId: cycles.data?.[0]?.id ?? "", name: "", shortName: "", track: "", description: "", order: 0 })}><Plus className="h-4 w-4" /> Niveau</button>
          </>
        }
      />

      {(cycleForm || levelForm) && (
        <div className="card mb-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-ink">{cycleForm ? (cycleForm.id ? "Modifier le cycle" : "Nouveau cycle") : levelForm?.id ? "Modifier le niveau" : "Nouveau niveau"}</h3>
            <button className="btn-ghost !p-2" aria-label="Fermer le formulaire" onClick={() => { setCycleForm(null); setLevelForm(null); }}><X className="h-4 w-4" /></button>
          </div>
          {cycleForm && (
            <form onSubmit={saveCycle} className="grid gap-4 md:grid-cols-3">
              <div><label className="label" htmlFor="admin-levels-94">Nom</label><input id="admin-levels-94" className="input" required value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} /></div>
              <div><label className="label" htmlFor="admin-levels-95">Description</label><input id="admin-levels-95" className="input" value={cycleForm.description} onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })} /></div>
              <div><label className="label" htmlFor="admin-levels-96">Ordre</label><input id="admin-levels-96" className="input" type="number" value={cycleForm.order} onChange={(e) => setCycleForm({ ...cycleForm, order: Number(e.target.value) })} /></div>
              {err && <p className="text-sm text-red-600 md:col-span-3">{err}</p>}
              <div className="md:col-span-3"><button className="btn-primary">Enregistrer</button></div>
            </form>
          )}
          {levelForm && (
            <form onSubmit={saveLevel} className="grid gap-4 md:grid-cols-3">
              <div><label className="label" htmlFor="admin-levels-103">Cycle</label>
                <select id="admin-levels-103" className="input" value={levelForm.cycleId} onChange={(e) => setLevelForm({ ...levelForm, cycleId: e.target.value })}>
                  {cycles.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="label" htmlFor="admin-levels-108">Nom complet</label><input id="admin-levels-108" className="input" required placeholder="Ex. : 2ème Bac Sciences Physiques" value={levelForm.name} onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })} /></div>
              <div><label className="label" htmlFor="admin-levels-109">Abréviation</label><input id="admin-levels-109" className="input" placeholder="Ex. : 2 Bac PC" value={levelForm.shortName} onChange={(e) => setLevelForm({ ...levelForm, shortName: e.target.value })} /></div>
              <div><label className="label" htmlFor="admin-levels-110">Filière / groupe (optionnel)</label><input id="admin-levels-110" className="input" placeholder="Ex. : 2ème année Bac" value={levelForm.track} onChange={(e) => setLevelForm({ ...levelForm, track: e.target.value })} /></div>
              <div><label className="label" htmlFor="admin-levels-111">Description</label><input id="admin-levels-111" className="input" value={levelForm.description} onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })} /></div>
              <div><label className="label" htmlFor="admin-levels-112">Ordre</label><input id="admin-levels-112" className="input" type="number" value={levelForm.order} onChange={(e) => setLevelForm({ ...levelForm, order: Number(e.target.value) })} /></div>
              {err && <p className="text-sm text-red-600 md:col-span-3">{err}</p>}
              <div className="md:col-span-3"><button className="btn-primary">Enregistrer</button></div>
            </form>
          )}
        </div>
      )}

      <div className="space-y-6">
        {cycles.data!.map((c) => (
          <div key={c.id} className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
              <h2 className="flex-1 font-bold text-ink">{c.name} <span className="ml-2 text-xs font-normal text-muted">{c.levels.length} niveaux</span></h2>
              <button aria-label="Modifier" className="btn-ghost !p-2" title="Modifier" onClick={() => setCycleForm({ id: c.id, name: c.name, description: c.description, order: c.order })}><Pencil className="h-4 w-4" /></button>
              <button aria-label="Supprimer" className="btn-ghost !p-2 text-red-600" title="Supprimer" onClick={() => del("cycles", c.id, c.name)}><Trash2 className="h-4 w-4" /></button>
            </div>
            <ul className="divide-y divide-slate-100">
              {levels.data!.filter((l) => l.cycleId === c.id).map((l) => {
                const isOpen = open[l.id];
                const available = (subjects.data ?? []).filter((s) => !l.subjects.some((ls) => ls.subject.id === s.id));
                return (
                  <li key={l.id}>
                    <div className="flex items-center gap-3 px-5 py-3">
                      <button aria-label={isOpen ? "Masquer les matières" : "Afficher les matières"} aria-expanded={isOpen} className="btn-ghost !p-2" onClick={() => setOpen({ ...open, [l.id]: !isOpen })}>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-ink">{l.name} {l.shortName && <span className="ml-1 text-xs text-muted">({l.shortName})</span>}</div>
                        <div className="text-xs text-muted">{l.track && `${l.track} · `}{l.subjects.length} matières · /niveau/{l.slug}</div>
                      </div>
                      <button aria-label="Modifier" className="btn-ghost !p-2" onClick={() => setLevelForm({ id: l.id, cycleId: l.cycleId!, name: l.name, shortName: l.shortName, track: l.track, description: l.description, order: l.order })}><Pencil className="h-4 w-4" /></button>
                      <button aria-label="Supprimer" className="btn-ghost !p-2 text-red-600" onClick={() => del("levels", l.id, l.name)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {isOpen && (
                      <div className="bg-slate-50/60 px-5 py-4 pl-14">
                        <div className="flex flex-wrap gap-2">
                          {l.subjects.map((ls) => (
                            <div key={ls.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-2 pr-1 text-sm">
                              <SubjectIcon icon={ls.subject.icon} color={ls.subject.color} className="h-3.5 w-3.5" boxClass="h-6 w-6 !rounded-md" />
                              <Link to={`/admin/programme/${ls.id}`} className="font-medium text-ink hover:text-brand-700">{ls.subject.name}</Link>
                              <button className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label={`Retirer ${ls.subject.name} de ce niveau`} onClick={() => detachSubject(ls.id, ls.subject.name)}><X className="h-3.5 w-3.5" /></button>
                            </div>
                          ))}
                          <select className="input !w-auto !py-1.5 text-sm" value="" onChange={(e) => attachSubject(l.id, e.target.value)}>
                            <option value="">+ Ajouter une matière</option>
                            {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <p className="mt-2 text-xs text-muted">Cliquez sur une matière pour gérer ses chapitres, cours et QCM.</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
