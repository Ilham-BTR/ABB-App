import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { compressAndUpload, type PhotoFolder } from "@/lib/upload";
import { photoUrl } from "@/lib/photo";
import { VisitResultRadio } from "@/components/VisitResultRadio";
import { Button } from "@/components/Button";
import { registerStatusFromResult, type VisitResult } from "@/lib/types";

type PhotoSlot = { key: string; label: string; path: string | null };

// Kolom foto -> folder upload di R2.
function folderFor(key: string): PhotoFolder {
  if (key.startsWith("selfie")) return "selfie";
  if (key.startsWith("store")) return "store";
  return "activity";
}

export function VisitAdminPanel({
  visitId,
  initialResult,
  initialDate,
  initialNotes,
  photos: initialPhotos,
  onChanged,
}: {
  visitId: string;
  initialResult: VisitResult | null;
  initialDate: string;
  initialNotes: string | null;
  photos: PhotoSlot[];
  onChanged?: () => void;
}) {
  const navigate = useNavigate();

  const [result, setResult] = useState<VisitResult | null>(initialResult);
  const [date, setDate] = useState(initialDate);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [photos, setPhotos] = useState<PhotoSlot[]>(initialPhotos);

  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function fotoUrl(path: string | null) {
    if (!path) return null;
    return photoUrl(path);
  }

  async function saveFields() {
    if (!result) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("visits")
      .update({
        visit_result: result,
        register_status: registerStatusFromResult(result),
        visit_date: date,
        notes: notes.trim() || null,
      })
      .eq("id", visitId);
    setSaving(false);
    setMsg(
      error
        ? { text: error.message, ok: false }
        : { text: "Changes saved.", ok: true }
    );
    if (!error) onChanged?.();
  }

  async function removePhoto(key: string) {
    setBusyKey(key);
    setMsg(null);
    const { error } = await supabase
      .from("visits")
      .update({ [key]: null })
      .eq("id", visitId);
    setBusyKey(null);
    if (error) {
      setMsg({ text: error.message, ok: false });
      return;
    }
    setPhotos((ps) => ps.map((p) => (p.key === key ? { ...p, path: null } : p)));
    setMsg({ text: "Photo deleted.", ok: true });
    onChanged?.();
  }

  async function replacePhoto(key: string, file: File) {
    setBusyKey(key);
    setMsg(null);
    try {
      const path = await compressAndUpload(folderFor(key), file);
      const { error } = await supabase
        .from("visits")
        .update({ [key]: path })
        .eq("id", visitId);
      if (error) throw new Error(error.message);
      setPhotos((ps) => ps.map((p) => (p.key === key ? { ...p, path } : p)));
      setMsg({ text: "Photo replaced.", ok: true });
      onChanged?.();
    } catch (err) {
      setMsg({
        text: err instanceof Error ? err.message : "Failed to replace photo.",
        ok: false,
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteVisit() {
    setDeleting(true);
    setMsg(null);

    // Ambil store_id dulu untuk hitung ulang status toko setelah hapus.
    const { data: vrow } = await supabase
      .from("visits")
      .select("store_id")
      .eq("id", visitId)
      .single();

    // .select() -> kembalikan baris yang benar-benar terhapus, untuk deteksi
    // kalau RLS diam-diam menghapus 0 baris (bukan error, tapi juga tidak hapus).
    const { data: deleted, error } = await supabase
      .from("visits")
      .delete()
      .eq("id", visitId)
      .select("id");
    if (error) {
      setMsg({ text: error.message, ok: false });
      setDeleting(false);
      return;
    }
    if (!deleted || deleted.length === 0) {
      setMsg({
        text:
          "Failed to delete: 0 rows deleted. Likely a permission (RLS) issue — make sure your role is 'superadmin' and migration 0012 (visits_delete_superadmin) has been run in Supabase.",
        ok: false,
      });
      setDeleting(false);
      return;
    }

    // Hitung ulang status toko = hasil kunjungan TERAKHIR yang tersisa.
    const storeId = (vrow as { store_id?: string } | null)?.store_id;
    if (storeId) {
      const { data: rest } = await supabase
        .from("visits")
        .select("visit_result, visit_date, created_at")
        .eq("store_id", storeId)
        .not("visit_result", "is", null)
        .order("visit_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
      if (rest && rest.length > 0 && rest[0].visit_result) {
        await supabase
          .from("stores")
          .update({
            register_status: registerStatusFromResult(
              rest[0].visit_result as VisitResult
            ),
          })
          .eq("id", storeId);
      }
    }

    navigate("/admin", { replace: true });
  }

  return (
    <div className="card space-y-4 border-2 border-amber-300 p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          Super Admin
        </span>
        <h2 className="font-semibold text-slate-800">Edit / Delete Visit</h2>
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

      {/* Edit field */}
      <VisitResultRadio value={result} onChange={setResult} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">
          Date
        </span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">
          Notes
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="input"
        />
      </label>
      <Button onClick={saveFields} loading={saving} disabled={!result}>
        Save Changes
      </Button>

      {/* Manage photos */}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Photos</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => {
            const url = fotoUrl(p.path);
            return (
              <div key={p.key} className="rounded-lg border border-slate-200 p-2">
                <p className="mb-1 text-xs font-medium text-slate-500">
                  {p.label}
                </p>
                <div className="relative mb-2 h-28 w-full overflow-hidden rounded-md bg-slate-100">
                  {url ? (
                    <img
                      src={url}
                      alt={p.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      None
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileRefs.current[p.key]?.click()}
                    disabled={busyKey === p.key}
                    className="flex-1 rounded-md border border-brand px-2 py-1 text-xs font-semibold text-brand disabled:opacity-50"
                  >
                    Replace
                  </button>
                  {p.path && (
                    <button
                      type="button"
                      onClick={() => removePhoto(p.key)}
                      disabled={busyKey === p.key}
                      className="flex-1 rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <input
                  ref={(el) => {
                    fileRefs.current[p.key] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) replacePhoto(p.key, f);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete visit */}
      <div className="border-t border-slate-100 pt-4">
        {confirmDel ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">
              Delete this visit? This cannot be undone.
            </span>
            <button
              onClick={deleteVisit}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, Delete"}
            </button>
            <button
              onClick={() => setConfirmDel(false)}
              disabled={deleting}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Delete Visit
          </button>
        )}
      </div>
    </div>
  );
}
