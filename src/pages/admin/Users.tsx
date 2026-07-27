import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Profile } from "@/lib/types";

const ROLES = [
  { value: "fos", label: "FOS" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Super Admin" },
];

function roleLabel(v: string) {
  return ROLES.find((r) => r.value === v)?.label ?? v;
}

export default function UsersPage() {
  const { session, role } = useAuth();
  const currentUserId = session?.user?.id ?? "";
  // Role diambil async oleh AuthContext; selama belum ada => masih mengecek.
  const checking = !!session && role === null;

  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (role !== "superadmin") return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, created_at")
        .order("created_at", { ascending: true });
      setRows((data as Profile[]) ?? []);
      setLoading(false);
    })();
  }, [role]);

  async function changeRole(id: string, newRole: string) {
    setSavingId(id);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id);
    if (error) {
      setMsg({ text: error.message, ok: false });
    } else {
      setRows((r) => r.map((p) => (p.id === id ? { ...p, role: newRole } : p)));
      setMsg({ text: "Role updated.", ok: true });
    }
    setSavingId(null);
  }

  if (checking) return <p className="text-sm text-slate-400">Loading…</p>;
  if (role !== "superadmin") return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Manage Users</h1>
        <p className="text-sm text-slate-500">
          Change each account&apos;s role. FOS = fills in visits · Admin = view &amp;
          manage data · Super Admin = full access.
        </p>
      </div>

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const isSelf = p.id === currentUserId;
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {p.full_name || "(no name)"}
                      {isSelf && (
                        <span className="ml-2 rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{roleLabel(p.role)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={p.role}
                        disabled={isSelf || savingId === p.id}
                        onChange={(e) => changeRole(p.id, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-100"
                        title={isSelf ? "You can't change your own role" : ""}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
