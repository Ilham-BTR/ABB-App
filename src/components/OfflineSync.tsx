import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAllQueued, removeFromQueue } from "@/lib/offlineQueue";
import { submitVisit } from "@/lib/visitSubmit";

// Kirim antrian kunjungan offline saat online; tampilkan status pending.
export function OfflineSync({ onSynced }: { onSynced?: () => void }) {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  // Kunjungan yang dibuang karena tokonya keburu berstatus final.
  const [droppedActive, setDroppedActive] = useState(0);

  const sync = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setPending((await getAllQueued()).length);
      return;
    }
    setSyncing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      const items = await getAllQueued();
      let sent = 0;
      let dropped = 0;
      for (const item of items) {
        if (uid && item.fosId !== uid) continue; // hanya milik user ini
        try {
          await submitVisit(item);
          await removeFromQueue(item.id);
          sent++;
        } catch (e) {
          // Antrian yang tidak akan pernah bisa masuk → buang, jangan diulang
          // selamanya: duplikat tanggal, atau toko sudah berstatus final.
          const msg = e instanceof Error ? e.message : "";
          if (msg === "VISIT_DUPLICATE") {
            await removeFromQueue(item.id);
          } else if (msg === "STORE_ALREADY_ACTIVE") {
            await removeFromQueue(item.id);
            dropped++;
          }
          // error lain: biarkan di antrian, coba lagi nanti
        }
      }
      const left = await getAllQueued();
      setPending(left.length);
      if (dropped > 0) setDroppedActive((n) => n + dropped);
      if (sent > 0) onSynced?.();
    } finally {
      setSyncing(false);
    }
  }, [onSynced]);

  useEffect(() => {
    sync();
    const onOnline = () => sync();
    window.addEventListener("online", onOnline);
    const iv = setInterval(sync, 60000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(iv);
    };
  }, [sync]);

  if (pending === 0 && droppedActive === 0) return null;

  return (
    <>
      {pending > 0 && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>
            {pending} kunjungan menunggu terkirim
            {syncing ? " — mengirim…" : ""}
          </span>
          <button
            onClick={sync}
            disabled={syncing}
            className="shrink-0 rounded-md border border-amber-400 px-2 py-1 text-xs font-semibold text-amber-700 disabled:opacity-50"
          >
            Kirim sekarang
          </button>
        </div>
      )}

      {droppedActive > 0 && (
        <div className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <span>
            {droppedActive} kunjungan offline tidak jadi terkirim: tokonya sudah
            berstatus <strong>Yes, Active</strong> (status final).
          </span>
          <button
            onClick={() => setDroppedActive(0)}
            className="shrink-0 rounded-md border border-emerald-400 px-2 py-1 text-xs font-semibold text-emerald-700"
          >
            OK
          </button>
        </div>
      )}
    </>
  );
}
