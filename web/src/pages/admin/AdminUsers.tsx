import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { useDebounce, useFetch } from "../../lib/hooks";
import type { User } from "../../lib/types";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { ErrorBox, PageHeader, Spinner } from "../../components/ui";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 300);
  const { data, loading, error, reload } = useFetch<User[]>(`/admin/users?q=${encodeURIComponent(dq)}`);

  const update = async (id: string, patch: Record<string, unknown>) => {
    await api.put(`/admin/users/${id}`, patch);
    reload();
  };
  const del = async (u: User) => {
    if (!confirm(`Supprimer le compte de ${u.name} (${u.email}) ?`)) return;
    await api.delete(`/admin/users/${u.id}`);
    reload();
  };
  const resetPassword = async (u: User) => {
    const p = prompt(`Nouveau mot de passe pour ${u.email} (6 caractères min.)`);
    if (p && p.length >= 6) await update(u.id, { password: p });
  };

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle="Gérez les rôles, les abonnements et les comptes." />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" type="search" aria-label="Nom ou email…" placeholder="Nom ou email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading && <Spinner />}
      {error && <ErrorBox message={error} retry={reload} />}
      {data && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Utilisateur</th><th className="px-4 py-3">Niveau</th><th className="px-4 py-3">Activité</th><th className="px-4 py-3">Rôle</th><th className="px-4 py-3">Abonnement</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5"><div className="font-medium text-ink">{u.name}</div><div className="text-xs text-muted">{u.email} · inscrit le {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-MA") : "—"}</div></td>
                  <td className="px-4 py-2.5 text-slate-600">{u.level?.name ?? <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{u._count?.progress ?? 0} cours · {u._count?.attempts ?? 0} QCM</td>
                  <td className="px-4 py-2.5">
                    <select className="input !w-auto !py-1 text-xs" value={u.role} disabled={u.id === me?.id} onChange={(e) => update(u.id, { role: e.target.value })}>
                      <option value="STUDENT">Élève</option><option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <select className="input !w-auto !py-1 text-xs" value={u.plan} onChange={(e) => update(u.id, { plan: e.target.value, premiumUntil: e.target.value === "PREMIUM" ? new Date(Date.now() + 365 * 86400000).toISOString() : null })}>
                      <option value="FREE">Gratuit</option><option value="PREMIUM">Premium</option>
                    </select>
                    {u.plan === "PREMIUM" && u.premiumUntil && <div className="mt-0.5 text-[11px] text-muted">jusqu'au {new Date(u.premiumUntil).toLocaleDateString("fr-MA")}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-ghost !py-1 !text-xs" onClick={() => resetPassword(u)}>Mot de passe</button>
                      <button aria-label="Supprimer" className="btn-ghost !p-2 text-red-600" disabled={u.id === me?.id} onClick={() => del(u)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
