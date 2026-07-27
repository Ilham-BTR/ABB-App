import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { VisitResultBadge } from "@/components/VisitResultBadge";
import { registerStatusLabel } from "@/lib/types";
import type { Store } from "@/lib/types";

type VisitRow = {
  id: string;
  visit_date: string;
  register_status: string;
  visit_result: string | null;
  fos: { full_name: string | null } | null;
};

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: sdata }, { data: visitsData }] = await Promise.all([
        supabase.from("stores").select("*").eq("id", id).single(),
        supabase
          .from("visits")
          .select(
            "id, visit_date, register_status, visit_result, fos:profiles!visits_fos_id_fkey(full_name)"
          )
          .eq("store_id", id)
          .order("visit_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      setStore((sdata as Store) ?? null);
      setVisits((visitsData as unknown as VisitRow[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  if (!store)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          to="/admin/stores"
          className="inline-flex text-sm font-medium text-brand hover:underline"
        >
          ← Back to Stores
        </Link>
        <p className="card px-3 py-10 text-center text-sm text-slate-400">
          Store not found.
        </p>
      </div>
    );

  const s = store;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/admin/stores"
        className="inline-flex text-sm font-medium text-brand hover:underline"
      >
        ← Back to Stores
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-slate-800">{s.name}</h1>
        {s.register_status && <StatusBadge status={s.register_status} />}
      </div>

      <div className="card grid grid-cols-2 gap-4 p-4 text-sm">
        <Info label="Current Status" value={registerStatusLabel(s.register_status)} />
        <Info label="Initial Status" value={registerStatusLabel(s.baseline_status)} />
        <Info label="Address" value={s.address ?? "-"} />
        <Info label="Phone" value={s.phone ?? "-"} />
        <Info label="Owner / Sales" value={s.owner_name ?? "-"} />
        <Info label="Distributor" value={s.distributor ?? "-"} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Visit History ({visits.length})
        </h2>
        {visits.length === 0 ? (
          <p className="card px-3 py-8 text-center text-sm text-slate-400">
            Never visited.
          </p>
        ) : (
          <ol className="card divide-y divide-slate-100">
            {visits.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{v.visit_date}</p>
                  <p className="truncate text-sm text-slate-400">
                    {v.fos?.full_name ?? "-"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <VisitResultBadge result={v.visit_result} />
                  <Link
                    to={`/admin/visits/${v.id}`}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Detail
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
