import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useFetch } from "../../lib/hooks";
import type { Subject } from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorBox, PageHeader, Spinner, SubjectIcon } from "../../components/ui";

const ICONS = ["sigma", "atom", "leaf", "book-open", "languages", "globe", "brain", "map", "moon", "code", "cog", "trending-up", "calculator", "flask", "lightbulb", "puzzle", "book"];

export default function AdminSubjects() {
  const { data, loading, error, reload } = useFetch<Subject[]>("/admin/subjects");
  const [form, setForm] = useState<{ id?: string; name: string; icon: string; color: string } | null>(null);
  const [err, setErr] = useState("");
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? "Erreur"} retry={reload} />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setErr("");
    try {
      const { id, ...b } = form;
      if (id) await api.put(`/admin/subjects/${id}`, b);
      else await api.post("/admin/subjects", b);
      setForm(null);
      reload();
    } catch (e: any) {
      setErr(e.message);
    }
  };
  const del = async (s: Subject) => {
    if (!confirm(`Supprimer la matière « ${s.name} » ? Elle sera retirée de ${s._count?.levels ?? 0} niveau(x) avec tout son contenu.`)) return;
    await api.delete(`/admin/subjects/${s.id}`);
    reload();
  };

  return (
    <div>
      <PageHeader title="Matières" subtitle="Les matières sont globales et peuvent être rattachées à plusieurs niveaux." actions={<button className="btn-primary" onClick={() => setForm({ name: "", icon: "book", color: "#0F766E" })}><Plus className="h-4 w-4" /> Nouvelle matière</button>} />
      {form && (
        <form onSubmit={save} className="card mb-6 grid gap-4 p-6 md:grid-cols-4">
          <div className="flex items-center justify-between md:col-span-4">
            <h3 className="font-bold text-ink">{form.id ? "Modifier" : "Nouvelle matière"}</h3>
            <button type="button" className="btn-ghost !p-2" onClick={() => setForm(null)}><X className="h-4 w-4" /></button>
          </div>
          <div className="md:col-span-2"><label className="label" htmlFor="admin-subjects-46">Nom</label><input id="admin-subjects-46" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="admin-subjects-47">Icône</label>
            <select id="admin-subjects-47" className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>{ICONS.map((i) => <option key={i} value={i}>{i}</option>)}</select>
          </div>
          <div><label className="label" htmlFor="admin-subjects-50">Couleur</label><div className="flex items-center gap-2"><input id="admin-subjects-50" type="color" className="h-10 w-12 rounded-lg border border-slate-300" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /><SubjectIcon icon={form.icon} color={form.color} boxClass="h-10 w-10" /></div></div>
          {err && <p className="text-sm text-red-600 md:col-span-4">{err}</p>}
          <div className="md:col-span-4"><button className="btn-primary">Enregistrer</button></div>
        </form>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((s) => (
          <div key={s.id} className="card flex items-center gap-3 p-4">
            <SubjectIcon icon={s.icon} color={s.color} className="h-5 w-5" boxClass="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-ink">{s.name}</div>
              <div className="text-xs text-muted">{s._count?.levels ?? 0} niveaux · {s.slug}</div>
            </div>
            <button aria-label="Modifier" className="btn-ghost !p-2" onClick={() => setForm({ id: s.id, name: s.name, icon: s.icon, color: s.color })}><Pencil className="h-4 w-4" /></button>
            <button aria-label="Supprimer" className="btn-ghost !p-2 text-red-600" onClick={() => del(s)}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
