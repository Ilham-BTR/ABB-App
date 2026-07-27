import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { exportXlsx, readXlsx } from "@/lib/excel";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import {
  statusFromExcel,
  registerStatusLabel,
  REGISTER_STATUS_OPTIONS,
} from "@/lib/types";

type Row = {
  name: string;
  address: string;
  phone: string;
  owner: string;
  distributor: string;
  statusRaw: string;
};

const HEADERS = [
  "Name",
  "Address",
  "Phone",
  "Owner/Sales",
  "Distributor",
  "Status",
];

export default function AdminAddStorePage() {
  const navigate = useNavigate();

  // --- Tambah manual ---
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [owner, setOwner] = useState("");
  const [mDistributor, setMDistributor] = useState("");
  const [mStatus, setMStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Toko dengan nama mirip (peringatan agar tidak dobel).
  const [similar, setSimilar] = useState<
    { id: string; name: string; address: string | null }[]
  >([]);

  useEffect(() => {
    const q = name.trim();
    if (q.length < 3) {
      setSimilar([]);
      return;
    }
    let active = true;
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, address")
        .ilike("name", `%${q}%`)
        .limit(5);
      if (active)
        setSimilar(
          (data as { id: string; name: string; address: string | null }[]) ?? []
        );
    }, 350);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [name]);

  const canSubmit = name.trim() && address.trim();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setSaveError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired, please log in again.");
      const { error } = await supabase.from("stores").insert({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || null,
        owner_name: owner.trim() || null,
        distributor: mDistributor.trim() || null,
        register_status: mStatus || null,
        baseline_status: mStatus || null,
        created_by: user.id,
      });
      if (error) throw new Error(error.message);
      navigate("/admin/stores", { replace: true });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save store.");
      setSaving(false);
    }
  }

  // --- Import Excel ---
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function downloadTemplate() {
    // Example covers all recognized Status values.
    await exportXlsx("template-toko.xlsx", "Stores", HEADERS, [
      [
        "Sample Active Store",
        "1 Example St.",
        "081200000001",
        "Budi",
        "Distributor A",
        "Yes, Active",
      ],
      [
        "Sample Registered Store",
        "2 Example St.",
        "081200000002",
        "Sari",
        "Distributor B",
        "Yes, Inactive",
      ],
      ["Sample Unregistered Store", "3 Example St.", "", "", "", "No"],
    ]);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportError(null);
    setResult(null);
    try {
      const raw = await readXlsx(file);
      const parsed: Row[] = raw
        .slice(1)
        .map((r) => ({
          name: r[0] ?? "",
          address: r[1] ?? "",
          phone: r[2] ?? "",
          owner: r[3] ?? "",
          distributor: r[4] ?? "",
          statusRaw: r[5] ?? "",
        }))
        .filter((r) => r.name.trim());
      setRows(parsed);
    } catch {
      setImportError(
        "Failed to read file. Make sure the .xlsx format matches the template."
      );
      setRows([]);
    }
  }

  async function doImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setImportError(null);
    setResult(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired, please log in again.");

      const { data: existing } = await supabase.from("stores").select("name");
      const existingNames = new Set(
        (existing ?? []).map((s) => (s.name as string).toLowerCase())
      );

      const toInsert = rows
        .filter((r) => !existingNames.has(r.name.trim().toLowerCase()))
        .map((r) => {
          const st = statusFromExcel(r.statusRaw);
          return {
            name: r.name.trim(),
            address: r.address.trim() || null,
            phone: r.phone.trim() || null,
            owner_name: r.owner.trim() || null,
            distributor: r.distributor.trim() || null,
            register_status: st,
            baseline_status: st,
            created_by: user.id,
          };
        });
      const skipped = rows.length - toInsert.length;

      if (toInsert.length > 0) {
        const { error } = await supabase.from("stores").insert(toInsert);
        if (error) throw new Error(error.message);
      }

      setResult(
        `${toInsert.length} stores imported${
          skipped > 0 ? `, ${skipped} skipped (name already exists/empty)` : ""
        }.`
      );
      setRows([]);
      setFileName("");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Add Store</h1>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Add manual */}
        <form onSubmit={handleAdd} className="card space-y-4 p-4">
          <div>
            <h2 className="font-semibold text-slate-800">Add a Single Store</h2>
            <p className="text-sm text-slate-500">
              Name &amp; address required. The rest are optional (can be filled in
              later).
            </p>
          </div>
          <FormField
            label="Store Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {similar.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs">
              <p className="font-medium text-amber-700">
                ⚠️ A store with a similar name already exists:
              </p>
              <ul className="mt-1 list-disc pl-4 text-amber-700">
                {similar.map((s) => (
                  <li key={s.id}>
                    {s.name}
                    {s.address ? ` — ${s.address}` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-amber-600">
                Make sure this isn&apos;t a duplicate before saving.
              </p>
            </div>
          )}
          <FormField
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <FormField
            label="Phone (optional)"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <FormField
            label="Owner / Sales (optional)"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
          <FormField
            label="Distributor (optional)"
            value={mDistributor}
            onChange={(e) => setMDistributor(e.target.value)}
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Status (optional)
            </span>
            <select
              value={mStatus}
              onChange={(e) => setMStatus(e.target.value)}
              className="input"
            >
              <option value="">-</option>
              {REGISTER_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {saveError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {saveError}
            </p>
          )}
          <Button type="submit" loading={saving} disabled={!canSubmit}>
            Save Store
          </Button>
        </form>

        {/* Import Excel */}
        <div className="card space-y-4 p-4">
          <div>
            <h2 className="font-semibold text-slate-800">Import from Excel</h2>
            <p className="text-sm text-slate-500">
              Download the template, fill it in Excel, then upload to import many
              stores at once.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Accepted <b>Status</b> column values: <b>Yes, Active</b> ·{" "}
              <b>Yes, Inactive</b> · <b>No</b> (not registered). Can be left blank.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand/5"
          >
            ⬇ Download Excel Template
          </button>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Upload file (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFile}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:font-semibold file:text-white"
            />
            {fileName && (
              <p className="mt-1 text-xs text-slate-500">File: {fileName}</p>
            )}
          </div>

          {importError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {importError}
            </p>
          )}
          {result && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              ✓ {result}
            </p>
          )}

          {rows.length > 0 && (
            <>
              <p className="text-sm text-slate-500">
                Preview {rows.length} rows ready to import:
              </p>
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      {HEADERS.map((h) => (
                        <th key={h} className="px-3 py-2 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {r.name}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{r.address}</td>
                        <td className="px-3 py-2 text-slate-600">{r.phone}</td>
                        <td className="px-3 py-2 text-slate-600">{r.owner}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.distributor}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {registerStatusLabel(statusFromExcel(r.statusRaw))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={doImport} loading={importing}>
                Import {rows.length} Stores
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
