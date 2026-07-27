import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart, type Bar } from "@/components/BarChart";
import { DonutChart } from "@/components/DonutChart";
import { HBarChart } from "@/components/HBarChart";
import { VISIT_RESULT_OPTIONS } from "@/lib/types";

type Row = {
  store_id: string;
  fos_id: string;
  register_status: string;
  visit_result: string | null;
  visit_date: string;
  fos: { full_name: string | null } | null;
};

type StoreRow = {
  id: string;
  register_status: string | null;
  baseline_status: string | null;
};

// Target kunjungan (toko aktif) — sesuaikan tiap periode di sini.
const TARGET_REAKTIVASI = 25; // toko database
const TARGET_NEW_REG = 40; // toko baru (luar database)

export default function DashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [storeRows, setStoreRows] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter untuk grafik berbasis kunjungan
  const [fos, setFos] = useState("all");
  const [result, setResult] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Halaman minggu tabel rincian (null = minggu terbaru).
  const [weekIdx, setWeekIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: sdata }] = await Promise.all([
        supabase
          .from("visits")
          .select(
            "store_id, fos_id, register_status, visit_result, visit_date, fos:profiles!visits_fos_id_fkey(full_name)"
          )
          .order("created_at", { ascending: false }),
        supabase.from("stores").select("id, register_status, baseline_status"),
      ]);
      setRows((data as unknown as Row[]) ?? []);
      setStoreRows((sdata as StoreRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const totalStores = storeRows.length;

  const fosOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.fos_id) map.set(r.fos_id, r.fos?.full_name || "(tanpa nama)");
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [rows]);

  // Kunjungan setelah filter (untuk grafik & angka berbasis kunjungan)
  const visits = rows.filter((r) => {
    if (fos !== "all" && r.fos_id !== fos) return false;
    if (result !== "all" && r.visit_result !== result) return false;
    if (from && r.visit_date < from) return false;
    if (to && r.visit_date > to) return false;
    return true;
  });

  function resetFilter() {
    setFos("all");
    setResult("all");
    setFrom("");
    setTo("");
  }

  // Grafik: Kunjungan per Tanggal (tren)
  const dateBars: Bar[] = useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of visits) c[v.visit_date] = (c[v.visit_date] ?? 0) + 1;
    return Object.entries(c)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value, color: "#0ea5e9" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits]);

  // Rincian per hari (per kunjungan/visit, bukan per toko).
  const daily = useMemo(() => {
    const baseline = new Map<string, string | null>();
    for (const s of storeRows) baseline.set(s.id, s.baseline_status);

    type D = {
      kunjungan: number;
      visitDb: number;
      visitNew: number;
      followup: number;
      decline: number;
      inactive: number;
      active: number;
    };
    const days = new Map<string, D>();
    const get = (d: string): D =>
      days.get(d) ?? {
        kunjungan: 0,
        visitDb: 0,
        visitNew: 0,
        followup: 0,
        decline: 0,
        inactive: 0,
        active: 0,
      };
    for (const v of visits) {
      const d = get(v.visit_date);
      d.kunjungan++;
      if (baseline.get(v.store_id) === "new") d.visitNew++;
      else d.visitDb++;
      if (v.visit_result === "yes_active") d.active++;
      else if (v.visit_result === "yes_inactive") d.inactive++;
      else if (v.visit_result === "decline") d.decline++;
      else if (v.visit_result === "follow_up") d.followup++;
      days.set(v.visit_date, d);
    }

    return Array.from(days.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({ date, ...d }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits, storeRows]);

  // Kelompokkan hari ke dalam minggu (Senin–Minggu), simpan tiap harinya
  // agar tabel bisa ditampilkan per tanggal, 1 minggu per halaman.
  type DailyRow = (typeof daily)[number];
  const weeksList = useMemo(() => {
    const map = new Map<
      string,
      { key: string; start: string; end: string; days: DailyRow[] }
    >();
    for (const d of daily) {
      const dt = new Date(`${d.date}T00:00:00Z`);
      const back = (dt.getUTCDay() + 6) % 7; // 0=Sen … 6=Min
      const monday = new Date(dt);
      monday.setUTCDate(dt.getUTCDate() - back);
      const key = monday.toISOString().slice(0, 10);
      const w = map.get(key) ?? { key, start: d.date, end: d.date, days: [] };
      w.days.push(d);
      if (d.date < w.start) w.start = d.date;
      if (d.date > w.end) w.end = d.date;
      map.set(key, w);
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [daily]);

  // Halaman minggu aktif (null = minggu terakhir/terbaru).
  const curWeekIdx =
    weeksList.length === 0
      ? -1
      : weekIdx == null
      ? weeksList.length - 1
      : Math.max(0, Math.min(weekIdx, weeksList.length - 1));
  const curWeek = curWeekIdx >= 0 ? weeksList[curWeekIdx] : null;

  const activeGrowthBars: Bar[] = daily.map((d) => ({
    label: d.date,
    value: d.active,
    color: "#16a34a",
  }));

  // Kartu & KPI MENGIKUTI filter (FOS / Visit Result / tanggal) — kecuali Total Toko.
  const visitedIds = new Set(visits.map((v) => v.store_id));
  // Toko DATABASE (impor) = bukan toko New yang dibuat MD saat kunjungan.
  const dbStores = storeRows.filter((s) => s.baseline_status !== "new");
  const dbCount = dbStores.length;
  // Reactivation Store = toko DATABASE (impor) yang dikunjungi (dalam filter).
  const reactivationStores = dbStores.filter((s) => visitedIds.has(s.id)).length;
  const coverage = dbCount > 0 ? Math.round((reactivationStores / dbCount) * 100) : 0;
  // Belum Dikunjungi = toko DATABASE yang belum dikunjungi (dalam filter).
  const belumDikunjungi = Math.max(dbCount - reactivationStores, 0);
  // New Store = toko baru yang dibuat MD saat kunjungan (dalam filter).
  const newStores = storeRows.filter(
    (s) => s.baseline_status === "new" && visitedIds.has(s.id)
  ).length;
  // Total Toko Kunjungan MD = semua toko unik yang dikunjungi (Reactivation + New).
  const totalTokoKunjunganMD = visitedIds.size;
  // Total Visit MD = semua record kunjungan (tanpa peduli duplikat toko).
  const totalVisitMD = visits.length;

  // Status kunjungan TERAKHIR tiap toko dalam cakupan filter.
  // (visits sudah terurut created_at desc; untuk tanggal sama, yang pertama = terbaru.)
  const baselineMap = new Map(storeRows.map((s) => [s.id, s.baseline_status]));
  const latestByStore = new Map<string, Row>();
  for (const v of visits) {
    const cur = latestByStore.get(v.store_id);
    if (!cur || v.visit_date > cur.visit_date) latestByStore.set(v.store_id, v);
  }
  const latestVisits = Array.from(latestByStore.values());
  // Perlu Follow-up = toko yang hasil kunjungan terakhirnya Follow-up.
  const perluFollowUp = latestVisits.filter(
    (v) => v.visit_result === "follow_up"
  ).length;
  // Status lain (per toko, dari kunjungan terakhir dalam filter).
  const inactiveStores = latestVisits.filter(
    (v) => v.visit_result === "yes_inactive"
  ).length;
  const declineStores = latestVisits.filter(
    (v) => v.visit_result === "decline"
  ).length;
  // Toko Aktif = toko yang hasil kunjungan terakhirnya Yes, Active (per toko unik).
  const activeStores = latestVisits.filter((v) => v.visit_result === "yes_active");
  const kpiActive = activeStores.length;
  // Pisah toko aktif: dari database (baseline ≠ new) vs dari toko baru MD.
  const reactivationActive = activeStores.filter(
    (v) => baselineMap.get(v.store_id) !== "new"
  ).length;
  const newStoreActive = activeStores.filter(
    (v) => baselineMap.get(v.store_id) === "new"
  ).length;

  // Komposisi hasil kunjungan per toko (untuk donut + horizontal bar).
  const storeResult = [
    { label: "Follow-up", value: perluFollowUp, color: "#E0A32E" },
    { label: "Decline", value: declineStores, color: "#D32F2F" },
    { label: "Inactive", value: inactiveStores, color: "#2E9D69" },
    { label: "Active", value: kpiActive, color: "#2E6E9E" },
  ];
  const storeResultTotal = storeResult.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          {/* Ringkasan */}
          <section className="space-y-2.5">
            <SectionTitle>Summary</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat
                icon="store"
                label="Total Store"
                value={totalStores}
                sub="DB + New Store"
                tone="#64748b"
              />
              <Stat
                icon="clipboard"
                label="Total Visit"
                value={totalVisitMD}
                sub="all visits (incl. repeat)"
                tone="#6366f1"
              />
              <Stat
                icon="mappin"
                label="Unique Store"
                value={totalTokoKunjunganMD}
                sub="unique stores visited"
                tone="#0ea5e9"
              />
              <Stat
                icon="database"
                label="Visit Database Store"
                value={reactivationStores}
                sub={`${coverage}% DB coverage`}
                tone="#2563eb"
              />
              <Stat
                icon="plus"
                label="Visit New Store"
                value={newStores}
                sub="new stores by MD"
                tone="#0891b2"
              />
              <Stat
                icon="clock"
                label="Not Visited"
                value={belumDikunjungi}
                sub="remaining DB target"
                tone="#d97706"
              />
            </div>
          </section>

          {/* Status toko — dari kunjungan terakhir */}
          <section className="space-y-2.5">
            <SectionTitle>Store Status</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat
                icon="refresh"
                label="Reactivation Store"
                value={reactivationActive}
                sub="active from database"
                tone="#16a34a"
                accent="text-green-600"
              />
              <Stat
                icon="check"
                label="New Store Active"
                value={newStoreActive}
                sub="active from new store"
                tone="#10b981"
                accent="text-emerald-600"
              />
              <Stat
                icon="bell"
                label="Follow-up"
                value={perluFollowUp}
                sub="potential Star Reward registration"
                tone="#4f46e5"
                accent="text-indigo-600"
              />
              <Stat
                icon="pause"
                label="Inactive"
                value={inactiveStores}
                sub="registered, invoice not uploaded"
                tone="#d97706"
                accent="text-amber-600"
              />
              <Stat
                icon="x"
                label="Decline"
                value={declineStores}
                sub="does not sell ABB products"
                tone="#dc2626"
                accent="text-red-600"
              />
            </div>
          </section>

          {/* Target vs Achievement */}
          <section className="card p-5">
            <h2 className="text-lg font-bold text-slate-800">
              Target vs Achievement
            </h2>
            <p className="text-sm text-slate-500">
              Pipeline achievement status against the visit target.
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <TargetBar
                title="Registration Store"
                achieved={kpiActive}
                target={TARGET_REAKTIVASI + TARGET_NEW_REG}
                color="#1e293b"
              />
              <TargetBar
                title="Reactivation Store (Inside the Database)"
                achieved={reactivationActive}
                target={TARGET_REAKTIVASI}
                color="#2E6E9E"
              />
              <TargetBar
                title="New Registration (Outside the Database)"
                achieved={newStoreActive}
                target={TARGET_NEW_REG}
                color="#D32F2F"
              />
            </div>
          </section>

          {/* Filter untuk grafik kunjungan */}
          <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select label="FOS" value={fos} onChange={setFos}>
              <option value="all">All FOS</option>
              {fosOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
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
            <div className="flex items-end">
              <button
                onClick={resetFilter}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Summary Store Visited — donut + horizontal bar */}
          <section className="card p-5">
            <h2 className="text-lg font-bold text-slate-800">
              Summary Store Visited
            </h2>
            <p className="text-sm text-slate-500">
              Composition of initial store status and the outcome of each visit.
            </p>

            <div className="mt-4 grid items-center gap-6 md:grid-cols-2">
              {/* Donut */}
              <div className="flex flex-col items-center">
                <DonutChart
                  data={storeResult}
                  centerValue={storeResultTotal}
                  centerLabel="Store"
                />
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {storeResult.map((d) => (
                    <span
                      key={d.label}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: d.color }}
                      />
                      {d.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Horizontal bar */}
              <div>
                <HBarChart data={[...storeResult].reverse()} />
              </div>
            </div>

            {/* Keterangan status */}
            <div className="mt-5 grid gap-x-6 gap-y-2 rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-500 sm:grid-cols-2">
              <Desc color="#E0A32E" label="Follow-up">
                Potential store for Star Reward registration.
              </Desc>
              <Desc color="#D32F2F" label="Decline">
                Does not sell ABB products.
              </Desc>
              <Desc color="#2E9D69" label="Inactive">
                Registered, invoice not uploaded.
              </Desc>
              <Desc color="#2E6E9E" label="Active">
                Registered &amp; invoice uploaded.
              </Desc>
            </div>
          </section>

          {/* Visits by Date (full width) */}
          <ChartCard title="Visits by Date">
            <BarChart data={dateBars} />
          </ChartCard>

          {/* Daily activation */}
          <ChartCard title="Daily Activation — Stores Turned Active">
            <BarChart
              data={activeGrowthBars}
              empty="No stores turned Active in this range."
            />
          </ChartCard>

          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Daily Progress Detail
              </h2>
              {curWeek && (
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setWeekIdx(curWeekIdx - 1)}
                    disabled={curWeekIdx <= 0}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-600 disabled:opacity-40"
                  >
                    ‹ Previous
                  </button>
                  <span className="min-w-[92px] text-center font-semibold text-slate-600">
                    {weekLabel(curWeek.start, curWeek.end)}
                  </span>
                  <button
                    onClick={() => setWeekIdx(curWeekIdx + 1)}
                    disabled={curWeekIdx >= weeksList.length - 1}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-600 disabled:opacity-40"
                  >
                    Next ›
                  </button>
                </div>
              )}
            </div>
            {!curWeek ? (
              <p className="card px-3 py-8 text-center text-sm text-slate-400">
                No data yet.
              </p>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Visit Date</th>
                      <th className="px-4 py-3 text-right font-semibold">Visits</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Visit by Database
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Visit by New Store
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">Followup</th>
                      <th className="px-4 py-3 text-right font-semibold">Decline</th>
                      <th className="px-4 py-3 text-right font-semibold">Inactive</th>
                      <th className="px-4 py-3 text-right font-semibold">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curWeek.days.map((d) => (
                      <tr
                        key={d.date}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-700">
                          {d.date}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                          {d.kunjungan}
                        </td>
                        <td className="px-4 py-2.5 text-right text-blue-600">
                          {d.visitDb > 0 ? d.visitDb : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-cyan-600">
                          {d.visitNew > 0 ? d.visitNew : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-indigo-600">
                          {d.followup > 0 ? d.followup : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-red-600">
                          {d.decline > 0 ? d.decline : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-amber-600">
                          {d.inactive > 0 ? d.inactive : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                          {d.active > 0 ? d.active : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// Label rentang minggu, mis. "2–4 Jul" atau "28 Jun–3 Jul".
function weekLabel(start: string, end: string): string {
  const sD = parseInt(start.slice(8, 10), 10);
  const eD = parseInt(end.slice(8, 10), 10);
  const sM = MONTH_SHORT[parseInt(start.slice(5, 7), 10) - 1];
  const eM = MONTH_SHORT[parseInt(end.slice(5, 7), 10) - 1];
  if (sM === eM) return `${sD}–${eD} ${eM}`;
  return `${sD} ${sM}–${eD} ${eM}`;
}

function ChartCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {note && <p className="mb-2 text-xs text-slate-400">{note}</p>}
      {!note && <div className="mb-2" />}
      {children}
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </h2>
  );
}

function Desc({
  color,
  label,
  children,
}: {
  color: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p className="flex gap-2">
      <span
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span>
        <b className="text-slate-700">{label}</b> — {children}
      </span>
    </p>
  );
}

// Kartu Target vs Achievement: capaian / target + progress bar + % coverage.
function TargetBar({
  title,
  achieved,
  target,
  color,
}: {
  title: string;
  achieved: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold" style={{ color }}>
          {achieved}
        </span>
        <span className="text-lg font-semibold text-slate-400">/ {target}</span>
        <span className="text-xs text-slate-400">store</span>
      </p>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="mt-1.5 text-xs">
        <span className="font-bold" style={{ color }}>
          {pct}%
        </span>{" "}
        <span className="text-slate-400">in terms of visit coverage</span>
      </p>
    </div>
  );
}

// Ikon garis sederhana (heroicons-style) untuk kartu statistik.
const ICON_PATHS: Record<string, string> = {
  store:
    "M13.5 21v-6a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 .75.75v6m-9 0V9.349M3.75 21V9.349m0 0a3 3 0 0 0 3.712-.966A3 3 0 0 0 9.75 9.75a3 3 0 0 0 2.25-1.016A3 3 0 0 0 14.25 9.75a3 3 0 0 0 2.288-1.367A3 3 0 0 0 20.25 9.35m-16.5 0a3 3 0 0 1-.62-4.72l1.19-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.19a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z",
  clipboard:
    "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48 48 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.25 2.25 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z",
  mappin:
    "M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z",
  database:
    "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75",
  plus: "M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  clock: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  refresh:
    "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99",
  check:
    "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  bell: "M14.857 17.082a24 24 0 0 0 5.454-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24 24 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
  pause: "M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  x: "m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
};

function StatIcon({ name, tone }: { name?: string; tone: string }) {
  const d = name ? ICON_PATHS[name] : undefined;
  if (!d) return null;
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `${tone}1a` }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={tone}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={d} />
      </svg>
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  icon,
  accent = "text-slate-800",
  tone = "#94a3b8",
}: {
  label: string;
  value: number;
  sub?: string;
  icon?: string;
  accent?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-400">
          {label}
        </p>
        <StatIcon name={icon} tone={tone} />
      </div>
      <p className={`mt-1.5 text-2xl font-bold leading-none ${accent}`}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
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
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
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
