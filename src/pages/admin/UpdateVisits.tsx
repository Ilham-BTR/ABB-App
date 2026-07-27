import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { readAllSheets } from "@/lib/excel";
import { Button } from "@/components/Button";
import {
  registerStatusFromResult,
  visitResultFromLabel,
  visitResultLabel,
  type VisitResult,
} from "@/lib/types";

type ParsedRow = {
  toko: string;
  tgl: string; // YYYY-MM-DD
  vr: VisitResult; // hasil koreksi dari Excel
  rawVr: string;
};

type MatchRow = ParsedRow & {
  visitId: string | null;
  storeId: string | null;
  oldVr: string | null;
  status: "changed" | "same" | "notfound";
};

type StoreRow = { id: string; name: string };
type VisitRow = {
  id: string;
  store_id: string;
  visit_date: string;
  visit_result: string | null;
  created_at: string;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

// Cari indeks kolom dari baris header berdasarkan sebagian nama.
function findCol(headers: string[], ...names: string[]): number {
  return headers.findIndex((h) => {
    const x = norm(h);
    return names.some((n) => x === norm(n) || x.includes(norm(n)));
  });
}

export default function KunjunganUpdatePage() {
  const { session, role } = useAuth();
  // Role diambil async oleh AuthContext; selama belum ada => masih mengecek.
  const checking = !!session && role === null;
  const isSuper = role === "superadmin";

  const [fileName, setFileName] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const summary = useMemo(() => {
    const changed = matches.filter((m) => m.status === "changed").length;
    const same = matches.filter((m) => m.status === "same").length;
    const notfound = matches.filter((m) => m.status === "notfound").length;
    return { changed, same, notfound };
  }, [matches]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setResult(null);
    setMatches([]);
    setSheetName("");
    try {
      const sheets = await readAllSheets(file);
      // Pilih sheet yang punya header Toko + Tanggal + Visit Result.
      let picked: { name: string; rows: string[][]; hi: number } | null = null;
      for (const sh of sheets) {
        for (let i = 0; i < Math.min(sh.rows.length, 5); i++) {
          const hdr = sh.rows[i];
          if (
            findCol(hdr, "toko", "store") >= 0 &&
            findCol(hdr, "tanggal", "date") >= 0 &&
            findCol(hdr, "visit result") >= 0
          ) {
            picked = { name: sh.name, rows: sh.rows, hi: i };
            break;
          }
        }
        if (picked) break;
      }
      if (!picked) {
        setParseError(
          "Could not find a sheet with the 'Toko', 'Tanggal', and 'Visit Result' columns. Make sure you use the Visits export file."
        );
        return;
      }
      setSheetName(picked.name);
      const hdr = picked.rows[picked.hi];
      const cToko = findCol(hdr, "toko", "store");
      const cTgl = findCol(hdr, "tanggal", "date");
      const cVr = findCol(hdr, "visit result");

      const parsed: ParsedRow[] = [];
      const bad: string[] = [];
      for (let r = picked.hi + 1; r < picked.rows.length; r++) {
        const row = picked.rows[r];
        const toko = (row[cToko] ?? "").trim();
        const tgl = (row[cTgl] ?? "").trim().slice(0, 10);
        const rawVr = (row[cVr] ?? "").trim();
        if (!toko && !tgl) continue;
        const vr = visitResultFromLabel(rawVr);
        if (!vr) {
          bad.push(`${toko} (${rawVr || "empty"})`);
          continue;
        }
        parsed.push({ toko, tgl, vr, rawVr });
      }

      if (parsed.length === 0) {
        setParseError(
          `No valid rows.${
            bad.length
              ? ` Unrecognized Visit Result: ${bad.slice(0, 5).join(", ")}`
              : ""
          }`
        );
        return;
      }

      // Ambil toko & kunjungan dari DB untuk pencocokan.
      const [{ data: sData }, { data: vData }] = await Promise.all([
        supabase.from("stores").select("id, name"),
        supabase
          .from("visits")
          .select("id, store_id, visit_date, visit_result, created_at"),
      ]);
      const stores = (sData as StoreRow[]) ?? [];
      const visits = (vData as VisitRow[]) ?? [];

      const storeByName = new Map<string, string>();
      for (const s of stores) storeByName.set(norm(s.name), s.id);
      const visitByKey = new Map<string, VisitRow>();
      for (const v of visits) visitByKey.set(`${v.store_id}|${v.visit_date}`, v);

      const rows: MatchRow[] = parsed.map((p) => {
        const storeId = storeByName.get(norm(p.toko)) ?? null;
        const visit = storeId ? visitByKey.get(`${storeId}|${p.tgl}`) : undefined;
        if (!storeId || !visit) {
          return {
            ...p,
            storeId,
            visitId: null,
            oldVr: null,
            status: "notfound",
          };
        }
        return {
          ...p,
          storeId,
          visitId: visit.id,
          oldVr: visit.visit_result,
          status: visit.visit_result === p.vr ? "same" : "changed",
        };
      });

      setMatches(rows);
      if (bad.length)
        setParseError(
          `${bad.length} rows skipped (unrecognized Visit Result): ${bad
            .slice(0, 5)
            .join(", ")}${bad.length > 5 ? "…" : ""}`
        );
    } catch {
      setParseError("Failed to read file. Make sure the .xlsx format is correct.");
    }
  }

  async function applyUpdate() {
    const changed = matches.filter((m) => m.status === "changed" && m.visitId);
    if (changed.length === 0) return;
    setApplying(true);
    setResult(null);
    try {
      // 1) Update visit_result + register_status per kunjungan.
      for (const m of changed) {
        const status = registerStatusFromResult(m.vr);
        const { error } = await supabase
          .from("visits")
          .update({ visit_result: m.vr, register_status: status })
          .eq("id", m.visitId as string);
        if (error) throw new Error(error.message);
      }

      // 2) Hitung ulang Status Register Program toko = hasil kunjungan TERAKHIR,
      //    untuk semua toko yang terpengaruh.
      const affected = Array.from(
        new Set(changed.map((m) => m.storeId as string))
      );
      const { data: vData } = await supabase
        .from("visits")
        .select("store_id, visit_date, visit_result, created_at")
        .in("store_id", affected);
      const latest = new Map<string, { key: string; vr: string }>();
      for (const v of (vData as VisitRow[]) ?? []) {
        if (!v.visit_result) continue;
        const key = `${v.visit_date} ${v.created_at}`;
        const cur = latest.get(v.store_id);
        if (!cur || key > cur.key)
          latest.set(v.store_id, { key, vr: v.visit_result });
      }
      for (const [storeId, info] of Array.from(latest.entries())) {
        const status = registerStatusFromResult(info.vr as VisitResult);
        await supabase
          .from("stores")
          .update({ register_status: status })
          .eq("id", storeId);
      }

      setResult(
        `${changed.length} visits updated, status of ${affected.length} stores recalculated.`
      );
      // Tandai baris jadi "same" setelah sukses.
      setMatches((prev) =>
        prev.map((m) =>
          m.status === "changed" ? { ...m, oldVr: m.vr, status: "same" } : m
        )
      );
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Failed to update.");
    } finally {
      setApplying(false);
    }
  }

  if (checking) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!isSuper)
    return (
      <div className="card p-6 text-sm text-slate-600">
        This page is for <b>superadmin</b> only (update visit data).
      </div>
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Update Visits from Excel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload the corrected Visits export file. The system matches each row to
          a visit by <b>Store Name + Date</b>, then updates the{" "}
          <b>Visit Result</b>. The store&apos;s <b>Registration Status</b> is
          automatically recalculated from the latest visit result.
        </p>
      </div>

      <div className="card space-y-3 p-4">
        <label className="block text-sm font-medium text-slate-700">
          Upload file (.xlsx)
        </label>
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFile}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:font-semibold file:text-white"
        />
        {fileName && (
          <p className="text-xs text-slate-500">
            File: {fileName}
            {sheetName && ` · sheet "${sheetName}"`}
          </p>
        )}
        {parseError && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {parseError}
          </p>
        )}
        {result && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            ✓ {result}
          </p>
        )}
      </div>

      {matches.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="#4f46e5" label={`${summary.changed} to change`} />
            <Badge tone="#16a34a" label={`${summary.same} already same`} />
            <Badge tone="#dc2626" label={`${summary.notfound} not found`} />
            <div className="ml-auto">
              <Button
                onClick={applyUpdate}
                loading={applying}
                disabled={summary.changed === 0}
              >
                Apply {summary.changed} Changes
              </Button>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Store</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Visit Result (app)</th>
                  <th className="px-4 py-3 font-semibold">Visit Result (file)</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...matches]
                  .sort((a, b) => {
                    const rank = { changed: 0, notfound: 1, same: 2 } as const;
                    return (
                      rank[a.status] - rank[b.status] || a.tgl.localeCompare(b.tgl)
                    );
                  })
                  .map((m, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-slate-700">
                        {m.toko}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{m.tgl}</td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {m.status === "notfound" ? "-" : visitResultLabel(m.oldVr)}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-700">
                        {visitResultLabel(m.vr)}
                      </td>
                      <td className="px-4 py-2.5">
                        {m.status === "changed" && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                            to change
                          </span>
                        )}
                        {m.status === "same" && (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">
                            same
                          </span>
                        )}
                        {m.status === "notfound" && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                            not found
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {summary.notfound > 0 && (
            <p className="text-xs text-slate-500">
              <b>Not found</b> rows = the store name/date does not match the
              database (e.g. different spelling/spacing, or the visit does not
              exist). Nothing is changed for these rows.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Badge({ tone, label }: { tone: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
      style={{ backgroundColor: tone }}
    >
      {label}
    </span>
  );
}
