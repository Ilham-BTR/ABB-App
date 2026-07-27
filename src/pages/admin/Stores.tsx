import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { exportXlsx } from "@/lib/excel";
import { StatusBadge } from "@/components/StatusBadge";
import { StoreEditModal } from "@/components/StoreEditModal";
import {
  REGISTER_STATUS_OPTIONS,
  VISIT_RESULT_OPTIONS,
  registerStatusLabel,
  visitResultLabel,
} from "@/lib/types";
import type { Store } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function AdminStoresPage() {
  const { role } = useAuth();
  const isSuper = role === "superadmin";

  const [stores, setStores] = useState<Store[]>([]);
  // Hasil Visit Result kunjungan terakhir per toko.
  const [lastResult, setLastResult] = useState<Record<string, string>>({});
  // Catatan (remarks) dari kunjungan terakhir per toko.
  const [lastNotes, setLastNotes] = useState<Record<string, string>>({});
  // Tanggal kunjungan update terakhir per toko.
  const [lastDate, setLastDate] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Filter
  const [query, setQuery] = useState("");
  const [distributor, setDistributor] = useState("all");
  const [status, setStatus] = useState("all");
  const [result, setResult] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [onlyVisited, setOnlyVisited] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  // Aksi
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Store | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: vdata }] = await Promise.all([
        supabase.from("stores").select("*").order("name", { ascending: true }),
        supabase
          .from("visits")
          .select("store_id, visit_result, visit_date, created_at, notes")
          .order("visit_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      setStores((data as Store[]) ?? []);
      const last: Record<string, string> = {};
      const lastD: Record<string, string> = {};
      const lastN: Record<string, string> = {};
      for (const v of (vdata as {
        store_id: string;
        visit_result: string | null;
        visit_date: string;
        notes: string | null;
      }[]) ?? []) {
        if (v.visit_result && !last[v.store_id]) {
          last[v.store_id] = v.visit_result;
          lastD[v.store_id] = v.visit_date;
          if (v.notes) lastN[v.store_id] = v.notes;
        }
      }
      setLastResult(last);
      setLastNotes(lastN);
      setLastDate(lastD);
      setLoading(false);
    })();
  }, []);

  const distributorOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => s.distributor && set.add(s.distributor));
    return Array.from(set).sort();
  }, [stores]);

  const filtered = stores.filter((s) => {
    if (
      query.trim() &&
      !s.name.toLowerCase().includes(query.trim().toLowerCase())
    )
      return false;
    if (distributor !== "all" && (s.distributor ?? "") !== distributor)
      return false;
    if (status !== "all" && (s.register_status ?? "") !== status) return false;
    if (result !== "all" && (lastResult[s.id] ?? "") !== result) return false;
    if (onlyVisited === "visited" && !lastDate[s.id]) return false;
    if (onlyVisited === "unvisited" && lastDate[s.id]) return false;
    const d = lastDate[s.id];
    if (from && (!d || d < from)) return false;
    if (to && (!d || d > to)) return false;
    return true;
  });

  function resetFilter() {
    setQuery("");
    setDistributor("all");
    setStatus("all");
    setResult("all");
    setFrom("");
    setTo("");
    setOnlyVisited("all");
  }

  useEffect(() => {
    setPage(1);
  }, [query, distributor, status, result, from, to, onlyVisited, pageSize]);

  const total = filtered.length;
  const perPage = pageSize === 0 ? total || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, totalPages);
  const paged = filtered.slice((current - 1) * perPage, current * perPage);

  const pageIds = paged.map((s) => s.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function deleteIds(ids: string[]) {
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Delete ${ids.length} stores? This action cannot be undone.`
      )
    )
      return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from("stores").delete().in("id", ids);
    setBusy(false);
    if (error) {
      setMsg({ text: error.message, ok: false });
      return;
    }
    const del = new Set(ids);
    setStores((prev) => prev.filter((s) => !del.has(s.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setMsg({ text: `${ids.length} stores deleted.`, ok: true });
  }

  function exportExcel() {
    exportXlsx(
      "toko.xlsx",
      "Stores",
      [
        "Name",
        "Initial Status",
        "Current Status",
        "Last Update",
        "Update Date",
        "Remarks",
        "Address",
        "Phone",
        "Owner/Sales",
        "Distributor",
        "Latitude",
        "Longitude",
        "Created",
      ],
      filtered.map((s) => [
        s.name,
        registerStatusLabel(s.baseline_status),
        registerStatusLabel(s.register_status),
        visitResultLabel(lastResult[s.id] ?? null),
        lastDate[s.id] ?? "",
        lastNotes[s.id] ?? "",
        s.address ?? "",
        s.phone ?? "",
        s.owner_name ?? "",
        s.distributor ?? "",
        s.latitude,
        s.longitude,
        s.created_at
          ? new Date(s.created_at).toLocaleString("id-ID", { hour12: false })
          : "",
      ])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-800">All Stores</h1>
        <button
          onClick={exportExcel}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
        >
          ⬇ Export Excel
        </button>
      </div>

      {/* Filter */}
      <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Search Store">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Store name…"
            className={inputClass}
          />
        </Field>
        <Field label="Registration Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Statuses</option>
            {REGISTER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Last Update (Visit Result)">
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Last Updates</option>
            {VISIT_RESULT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Distributor">
          <select
            value={distributor}
            onChange={(e) => setDistributor(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Distributors</option>
            {distributorOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Visits">
          <select
            value={onlyVisited}
            onChange={(e) => setOnlyVisited(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Stores</option>
            <option value="visited">Visited</option>
            <option value="unvisited">Not visited</option>
          </select>
        </Field>
        <Field label="Update Date From">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Update Date To">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Show">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className={inputClass}
          >
            <option value={10}>10 records</option>
            <option value={25}>25 records</option>
            <option value={50}>50 records</option>
            <option value={100}>100 records</option>
            <option value={0}>All</option>
          </select>
        </Field>
        <div className="flex items-end">
          <button
            onClick={resetFilter}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600"
          >
            Reset Filters
          </button>
        </div>
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          {total === 0
            ? "0 stores"
            : `Showing ${(current - 1) * perPage + 1}–${Math.min(
                current * perPage,
                total
              )} of ${total} stores`}
        </p>
        {isSuper && selected.size > 0 && (
          <button
            onClick={() => deleteIds(Array.from(selected))}
            disabled={busy}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            Delete {selected.size} selected
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="card px-3 py-10 text-center text-sm text-slate-400">
          No stores match the filters.
        </p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {isSuper && (
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleAllPage}
                        className="h-4 w-4 accent-brand"
                        aria-label="Select all"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-right font-semibold">No</th>
                  <th className="px-4 py-3 font-semibold">Store Name</th>
                  <th className="px-3 py-3 font-semibold">Initial Status</th>
                  <th className="px-3 py-3 font-semibold">Current Status</th>
                  <th className="px-3 py-3 font-semibold">Update Date</th>
                  <th className="px-3 py-3 font-semibold">Address</th>
                  <th className="px-3 py-3 font-semibold">Distributor</th>
                  <th className="px-3 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70 ${
                      selected.has(s.id) ? "bg-brand/5" : ""
                    }`}
                  >
                    {isSuper && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggle(s.id)}
                          className="h-4 w-4 accent-brand"
                          aria-label={`Select ${s.name}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-400">
                      {(current - 1) * perPage + i + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        to={`/admin/stores/${s.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {s.baseline_status ? (
                        <StatusBadge status={s.baseline_status} />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.register_status ? (
                        <StatusBadge status={s.register_status} />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {lastDate[s.id] ?? <span className="text-slate-300">-</span>}
                    </td>
                    <td className="max-w-[220px] px-3 py-3 text-slate-600">
                      {s.address ? (
                        <span className="line-clamp-2">{s.address}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {s.distributor ?? <span className="text-slate-300">-</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <button
                        onClick={() => setEditing(s)}
                        className="text-sm font-semibold text-brand hover:underline"
                      >
                        Edit
                      </button>
                      {isSuper && (
                        <button
                          onClick={() => deleteIds([s.id])}
                          disabled={busy}
                          className="ml-3 text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage(current - 1)}
            disabled={current <= 1}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-600 disabled:opacity-40"
          >
            ‹ Previous
          </button>
          <span className="text-slate-500">
            Page {current} / {totalPages}
          </span>
          <button
            onClick={() => setPage(current + 1)}
            disabled={current >= totalPages}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-600 disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      )}

      <Link
        to="/admin/stores/new"
        className="block rounded-xl border border-dashed border-brand/50 px-4 py-3 text-center font-semibold text-brand transition hover:bg-brand/5"
      >
        + Add / Import Store
      </Link>

      {editing && (
        <StoreEditModal
          store={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setStores((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
            setEditing(null);
            setMsg({ text: "Store updated.", ok: true });
          }}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}
