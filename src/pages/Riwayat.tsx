import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { VisitResultBadge } from "@/components/VisitResultBadge";
import { VISIT_RESULT_OPTIONS } from "@/lib/types";

type Row = {
  id: string;
  visit_date: string;
  register_status: string;
  visit_result: string | null;
  created_at: string;
  stores: { name: string; register_status: string | null } | null;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function Riwayat() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [result, setResult] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("visits")
        .select(
          "id, visit_date, register_status, visit_result, created_at, stores(name, register_status)"
        )
        .order("created_at", { ascending: false });
      setRows((data as unknown as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((v) => {
    if (
      query.trim() &&
      !(v.stores?.name ?? "")
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    )
      return false;
    if (result !== "all" && v.visit_result !== result) return false;
    if (from && v.visit_date < from) return false;
    if (to && v.visit_date > to) return false;
    return true;
  });

  function resetFilter() {
    setQuery("");
    setResult("all");
    setFrom("");
    setTo("");
  }

  const hasFilter =
    query.trim() || result !== "all" || from || to ? true : false;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/" className="text-sm font-medium text-brand hover:underline">
          ← Beranda
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Riwayat Kunjungan</h1>
        <span className="text-sm text-slate-500">{filtered.length} kunjungan</span>
      </div>

      {/* Filter */}
      <div className="card space-y-2 p-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama toko…"
          className={inputClass}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className={inputClass}
          >
            <option value="all">Semua Visit Result</option>
            {VISIT_RESULT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClass}
              aria-label="Tanggal dari"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClass}
              aria-label="Tanggal sampai"
            />
          </div>
        </div>
        {hasFilter && (
          <button
            onClick={resetFilter}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
          >
            Reset Filter
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Memuat…</p>
      ) : filtered.length === 0 ? (
        <div className="card px-3 py-12 text-center text-sm text-slate-400">
          {rows.length === 0
            ? "Belum ada kunjungan."
            : "Tidak ada kunjungan sesuai filter."}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((v) => (
            <li
              key={v.id}
              className="card flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {v.stores?.name ?? "Toko"}
                </p>
                <p className="text-sm text-slate-400">{v.visit_date}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Status</span>
                  {v.stores?.register_status ? (
                    <StatusBadge status={v.stores.register_status} />
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Visit</span>
                  <VisitResultBadge result={v.visit_result} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
