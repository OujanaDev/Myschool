import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/hooks";
import type { Level, Subject } from "../../lib/types";

type AdminLevel = Level & { subjects: { id: string; subject: Subject }[] };
type LS = { id: string; chapters: { id: string; title: string; semester: number }[] };

/** Cascading selector: level → subject → chapter. Emits the chapterId. */
export function ChapterPicker({ value, onChange }: { value: string; onChange: (chapterId: string) => void }) {
  const { data: levels } = useFetch<AdminLevel[]>("/admin/levels");
  const [levelId, setLevelId] = useState("");
  const [lsId, setLsId] = useState("");
  const [ls, setLs] = useState<LS | null>(null);
  const [resolved, setResolved] = useState(false);

  // Resolve the current chapter to its level/subject when editing an existing item
  useEffect(() => {
    if (!value || resolved || !levels) return;
    (async () => {
      for (const l of levels) {
        for (const s of l.subjects) {
          const d = await api.get<LS>(`/admin/level-subjects/${s.id}`);
          if (d.chapters.some((c) => c.id === value)) {
            setLevelId(l.id);
            setLsId(s.id);
            setLs(d);
            setResolved(true);
            return;
          }
        }
      }
      setResolved(true);
    })();
  }, [value, levels, resolved]);

  useEffect(() => {
    if (!lsId) {
      setLs(null);
      return;
    }
    api.get<LS>(`/admin/level-subjects/${lsId}`).then(setLs);
  }, [lsId]);

  const level = levels?.find((l) => l.id === levelId);
  return (
    <div className="space-y-2">
      <select className="input" value={levelId} onChange={(e) => { setLevelId(e.target.value); setLsId(""); onChange(""); }}>
        <option value="">Niveau…</option>
        {(levels ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <select className="input" value={lsId} disabled={!level} onChange={(e) => { setLsId(e.target.value); onChange(""); }}>
        <option value="">Matière…</option>
        {(level?.subjects ?? []).map((s) => <option key={s.id} value={s.id}>{s.subject.name}</option>)}
      </select>
      <select className="input" value={value} disabled={!ls} onChange={(e) => onChange(e.target.value)}>
        <option value="">Chapitre…</option>
        {(ls?.chapters ?? []).map((c) => <option key={c.id} value={c.id}>S{c.semester} · {c.title}</option>)}
      </select>
    </div>
  );
}
