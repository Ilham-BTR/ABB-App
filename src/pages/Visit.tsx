import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/upload";
import { submitVisit, type SubmitPayload } from "@/lib/visitSubmit";
import { addToQueue } from "@/lib/offlineQueue";
import { Button } from "@/components/Button";
import { PhotoInput } from "@/components/PhotoInput";
import { MultiPhotoInput } from "@/components/MultiPhotoInput";
import { GpsButton } from "@/components/GpsButton";
import { StoreField, type StoreSelection } from "@/components/StoreField";
import { VisitResultRadio } from "@/components/VisitResultRadio";
import type { LatLng } from "@/lib/geo";
import { registerStatusLabel, type VisitResult } from "@/lib/types";

export default function Visit() {
  const nav = useNavigate();

  const [selection, setSelection] = useState<StoreSelection>(null);
  const [visitDate, setVisitDate] = useState("");
  const [visitResult, setVisitResult] = useState<VisitResult | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [storePhotos, setStorePhotos] = useState<File[]>([]);
  const [activityPhotos, setActivityPhotos] = useState<File[]>([]);
  const [gps, setGps] = useState<LatLng | null>(null);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default tanggal = hari ini.
  useEffect(() => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
    setVisitDate(iso);
  }, []);

  // Status Register Program hanya tampilan (tidak diisi MD). Diambil dari DB;
  // untuk toko baru = "New".
  const currentStatusLabel =
    selection?.mode === "existing"
      ? registerStatusLabel(selection.store.register_status)
      : selection?.mode === "new"
      ? "New (toko baru)"
      : "-";

  const storeReady =
    selection?.mode === "existing"
      ? true
      : selection?.mode === "new"
      ? !!(
          selection.data.name.trim() &&
          selection.data.address.trim() &&
          selection.data.phone.trim() &&
          selection.data.ownerName.trim()
        )
      : false;

  const canSubmit =
    storeReady &&
    visitDate &&
    visitResult &&
    selfie &&
    storePhotos.length >= 2 &&
    activityPhotos.length >= 2 &&
    gps;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !canSubmit ||
      !selection ||
      !visitResult ||
      !selfie ||
      storePhotos.length < 2 ||
      activityPhotos.length < 2 ||
      !gps
    )
      return;
    setLoading(true);
    setError(null);

    try {
      // getSession baca sesi lokal + auto-refresh token (tanpa panggilan
      // jaringan yang bisa gagal di HP saat form lama diisi).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Sesi habis, silakan login ulang.");

      // Cek: toko terdaftar tidak boleh dikunjungi 2x di tanggal yang sama.
      if (
        selection.mode === "existing" &&
        typeof navigator !== "undefined" &&
        navigator.onLine
      ) {
        const { data: dup } = await supabase
          .from("visits")
          .select("id")
          .eq("store_id", selection.store.id)
          .eq("visit_date", visitDate)
          .limit(1);
        if (dup && dup.length > 0) {
          setError(
            "Toko ini sudah dikunjungi pada tanggal ini. Tidak bisa submit 2 kali dalam sehari."
          );
          setLoading(false);
          return;
        }
      }

      // Kompres semua foto dulu (dipakai untuk kirim online maupun simpan offline).
      const [selfieBlob, storeBlobs, activityBlobs] = await Promise.all([
        compressImage(selfie),
        Promise.all(storePhotos.map(compressImage)),
        Promise.all(activityPhotos.map(compressImage)),
      ]);

      const payload: SubmitPayload = {
        fosId: user.id,
        visitDate,
        visitResult,
        gps,
        notes: notes.trim() || null,
        store:
          selection.mode === "existing"
            ? {
                mode: "existing",
                id: selection.store.id,
                currentStatus: selection.store.register_status,
                hasCoord:
                  selection.store.latitude != null &&
                  selection.store.longitude != null,
                details: selection.details,
              }
            : { mode: "new", data: selection.data },
        photos: { selfie: selfieBlob, store: storeBlobs, activity: activityBlobs },
      };

      const queueOffline = async () => {
        await addToQueue({
          ...payload,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        });
        nav("/", { replace: true });
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueOffline();
        return;
      }

      try {
        await submitVisit(payload);
        nav("/", { replace: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "VISIT_DUPLICATE") {
          setError(
            "Toko ini sudah dikunjungi pada tanggal ini. Tidak bisa submit 2 kali dalam sehari."
          );
          setLoading(false);
          return;
        }
        const isNetwork =
          (typeof navigator !== "undefined" && !navigator.onLine) ||
          /fetch|network|failed to fetch|timeout|load failed/i.test(msg);
        if (isNetwork) {
          await queueOffline();
          return;
        }
        throw err; // error nyata (bukan jaringan) → tampilkan
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kunjungan.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Link
        to="/"
        className="inline-flex items-center text-sm font-medium text-brand hover:underline"
      >
        ← Kembali
      </Link>
      <h1 className="text-xl font-bold text-slate-800">Kunjungan Toko</h1>

      <div className="card space-y-4 p-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Tanggal Kunjungan <span className="text-red-500">*</span>
        </span>
        <input
          type="date"
          value={visitDate}
          readOnly
          disabled
          className="input cursor-not-allowed bg-slate-100 text-slate-600"
        />
      </label>

      <StoreField onChange={setSelection} />

      <GpsButton value={gps} onChange={setGps} required autoLoad />

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">
          Status Register Program
        </span>
        <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-700">
          {currentStatusLabel}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Otomatis dari database — ter-update sesuai Visit Result kunjungan.
        </p>
      </div>

      <VisitResultRadio value={visitResult} onChange={setVisitResult} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Catatan (opsional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="input"
        />
      </label>

      <PhotoInput
        label="Foto Selfie"
        facing="user"
        onChange={setSelfie}
        required
      />
      <MultiPhotoInput
        label="Foto Toko"
        facing="environment"
        max={2}
        required
        onChange={setStorePhotos}
      />
      <MultiPhotoInput
        label="Foto Activity"
        facing="environment"
        max={2}
        required
        onChange={setActivityPhotos}
      />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} disabled={!canSubmit}>
        Simpan Kunjungan
      </Button>
    </form>
  );
}
