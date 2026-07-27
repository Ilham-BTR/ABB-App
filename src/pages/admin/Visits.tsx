import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { exportXlsx } from "@/lib/excel";
import { photoUrl } from "@/lib/photo";
import { StatusBadge } from "@/components/StatusBadge";
import { VisitResultBadge } from "@/components/VisitResultBadge";
import {
  REGISTER_STATUS_OPTIONS,
  VISIT_RESULT_OPTIONS,
  visitResultLabel,
} from "@/lib/types";

type AdminVisit = {
  id: string;
  fos_id: string;
  visit_date: string;
  register_status: string;
  visit_result: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_at: string;
  selfie_url: string | null;
  store_photo_url: string | null;
  store_photo_url_2: string | null;
  activity_photo_url: string | null;
  activity_photo_url_2: string | null;
  stores: {
    name: string;
    address: string | null;
    phone: string | null;
    owner_name: string | null;
    distributor: string | null;
    register_status: string | null;
    baseline_status: string | null;
  } | null;
  fos: { full_name: string | null } | null;
};

function statusLabel(value: string) {
  return REGISTER_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function fmtTime(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("id-ID", { hour12: false });
  } catch {
    return iso;
  }
}

export default function AdminVisitsPage() {
  const [visits, setVisits] = useState<AdminVisit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [fos, setFos] = useState("all");
  const [status, setStatus] = useState("all");
  const [result, setResult] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [storeQuery, setStoreQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("visits")
        .select(
          "id, fos_id, visit_date, register_status, visit_result, latitude, longitude, notes, created_at, selfie_url, store_photo_url, store_photo_url_2, activity_photo_url, activity_photo_url_2, stores(name, address, phone, owner_name, distributor, register_status, baseline_status), fos:profiles!visits_fos_id_fkey(full_name)"
        )
        .order("created_at", { ascending: false });
      setVisits((data as unknown as AdminVisit[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Opsi FOS unik dari data
  const fosOptions = useMemo(() => {
    const map = new Map<string, string>();
    visits.forEach((v) => {
      if (v.fos_id) map.set(v.fos_id, v.fos?.full_name || "(no name)");
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [visits]);

  const filtered = visits.filter((v) => {
    if (fos !== "all" && v.fos_id !== fos) return false;
    if (status !== "all" && (v.stores?.register_status ?? "") !== status)
      return false;
    if (result !== "all" && v.visit_result !== result) return false;
    if (from && v.visit_date < from) return false;
    if (to && v.visit_date > to) return false;
    if (
      storeQuery.trim() &&
      !(v.stores?.name ?? "")
        .toLowerCase()
        .includes(storeQuery.trim().toLowerCase())
    )
      return false;
    return true;
  });

  useEffect(() => {
    setPage(1);
  }, [fos, status, result, from, to, storeQuery, pageSize]);

  const total = filtered.length;
  const perPage = pageSize === 0 ? total || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, totalPages);
  const paged = filtered.slice((current - 1) * perPage, current * perPage);

  function resetFilter() {
    setFos("all");
    setStatus("all");
    setResult("all");
    setFrom("");
    setTo("");
    setStoreQuery("");
  }

  function exportExcel() {
    exportXlsx(
      "kunjungan.xlsx",
      "Visits",
      [
        // "Date" & "Store" are matched on re-import (kunjungan-update findCol
        // matches "date"/"store" too), so the round-trip still works.
        "Date",
        "Input Time",
        "FOS",
        "Store",
        "Address",
        "Phone",
        "Owner/Sales",
        "Distributor",
        "Initial Status",
        "Visit Result",
        "Registration Status",
        "Latitude",
        "Longitude",
        "Selfie Link",
        "Store Photo Link 1",
        "Store Photo Link 2",
        "Activity Photo Link 1",
        "Activity Photo Link 2",
        "Notes",
      ],
      filtered.map((v) => [
        v.visit_date,
        fmtTime(v.created_at),
        v.fos?.full_name ?? "",
        v.stores?.name ?? "",
        v.stores?.address ?? "",
        v.stores?.phone ?? "",
        v.stores?.owner_name ?? "",
        v.stores?.distributor ?? "",
        statusLabel(v.stores?.baseline_status ?? ""),
        visitResultLabel(v.visit_result),
        statusLabel(v.stores?.register_status ?? ""),
        v.latitude,
        v.longitude,
        photoUrl(v.selfie_url),
        photoUrl(v.store_photo_url),
        photoUrl(v.store_photo_url_2),
        photoUrl(v.activity_photo_url),
        photoUrl(v.activity_photo_url_2),
        v.notes ?? "",
      ])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">All Visits</h1>
        <button
          onClick={exportExcel}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
        >
          ⬇ Export Excel
        </button>
      </div>

      {/* Filter */}
      <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="FOS" value={fos} onChange={setFos}>
          <option value="all">All FOS</option>
          {fosOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
        <Select label="Status" value={status} onChange={setStatus}>
          <option value="all">All Statuses</option>
          {REGISTER_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select label="Visit Result" value={result} onChange={setResult}>
          <option value="all">All Results</option>
          {VISIT_RESULT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Field label="Search Store">
          <input
            type="text"
            value={storeQuery}
            onChange={(e) => setStoreQuery(e.target.value)}
            placeholder="Store name…"
            className={inputClass}
          />
        </Field>
        <Field label="Date From">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Date To">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Select
          label="Show"
          value={String(pageSize)}
          onChange={(v) => setPageSize(Number(v))}
        >
          <option value="10">10 records</option>
          <option value="25">25 records</option>
          <option value="50">50 records</option>
          <option value="100">100 records</option>
          <option value="0">All</option>
        </Select>
        <div className="flex items-end">
          <button
            onClick={resetFilter}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {total === 0
          ? "0 visits"
          : `Showing ${(current - 1) * perPage + 1}–${Math.min(
              current * perPage,
              total
            )} of ${total} visits`}
      </p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="card px-3 py-10 text-center text-sm text-slate-400">
          No visits match the filters.
        </p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">FOS</th>
                <th className="px-4 py-3 font-semibold">Store</th>
                <th className="px-4 py-3 font-semibold">Initial Status</th>
                <th className="px-4 py-3 font-semibold">Visit Result</th>
                <th className="px-4 py-3 font-semibold">Registration Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {v.visit_date}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {v.fos?.full_name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.stores?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {v.stores?.baseline_status ? (
                      <StatusBadge status={v.stores.baseline_status} />
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <VisitResultBadge result={v.visit_result} />
                  </td>
                  <td className="px-4 py-3">
                    {v.stores?.register_status ? (
                      <StatusBadge status={v.stores.register_status} />
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/visits/${v.id}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

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

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {children}
      </select>
    </Field>
  );
}
