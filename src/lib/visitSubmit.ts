import { supabase } from "@/lib/supabase";
import { uploadBlob } from "@/lib/upload";
import {
  isFinalStatus,
  registerStatusFromResult,
  type VisitResult,
} from "@/lib/types";
import type { NewStoreData, StoreDetails } from "@/components/StoreField";

export type SubmitPayload = {
  fosId: string;
  visitDate: string;
  visitResult: VisitResult;
  gps: { lat: number; lng: number };
  notes: string | null;
  store:
    | {
        mode: "existing";
        id: string;
        currentStatus: string | null;
        hasCoord: boolean;
        details?: StoreDetails;
      }
    | { mode: "new"; data: NewStoreData };
  photos: { selfie: Blob; store: Blob[]; activity: Blob[] };
};

// Upload foto + update/insert toko + insert kunjungan.
// Dipakai baik saat submit online maupun saat sync dari antrian offline.
export async function submitVisit(p: SubmitPayload): Promise<void> {
  const fid = p.fosId;

  // "Yes, Active" = status final. Dicek ulang di sini (bukan hanya di form)
  // karena kunjungan offline bisa ter-sync lama setelah diisi — status toko
  // mungkin sudah berubah jadi aktif oleh MD lain. Cek sebelum upload foto
  // supaya tidak membuang kuota.
  if (p.store.mode === "existing") {
    const { data: cur } = await supabase
      .from("stores")
      .select("register_status")
      .eq("id", p.store.id)
      .single();
    if (isFinalStatus((cur as { register_status?: string } | null)?.register_status))
      throw new Error("STORE_ALREADY_ACTIVE");
  }

  const [selfiePath, storePaths, activityPaths] = await Promise.all([
    uploadBlob("selfie", p.photos.selfie),
    Promise.all(p.photos.store.map((b) => uploadBlob("store", b))),
    Promise.all(p.photos.activity.map((b) => uploadBlob("activity", b))),
  ]);

  // Status Sekarang toko = hasil kunjungan ini (apa pun).
  const storeStatus = registerStatusFromResult(p.visitResult);

  let storeId: string;
  if (p.store.mode === "existing") {
    storeId = p.store.id;
    const patch: {
      register_status: string;
      latitude?: number;
      longitude?: number;
      address?: string | null;
      phone?: string | null;
      owner_name?: string | null;
      distributor?: string | null;
    } = { register_status: storeStatus };
    if (!p.store.hasCoord) {
      patch.latitude = p.gps.lat;
      patch.longitude = p.gps.lng;
    }
    // Data toko yang dilengkapi MD saat kunjungan (pre-filled dari nilai lama,
    // jadi field yang tidak diubah tetap sama).
    if (p.store.details) {
      const d = p.store.details;
      patch.address = d.address.trim() || null;
      patch.phone = d.phone.trim() || null;
      patch.owner_name = d.ownerName.trim() || null;
      patch.distributor = d.distributor.trim() || null;
    }
    const { error } = await supabase
      .from("stores")
      .update(patch)
      .eq("id", storeId);
    if (error) throw new Error(error.message);
  } else {
    const d = p.store.data;
    const { data: newStore, error } = await supabase
      .from("stores")
      .insert({
        name: d.name.trim(),
        address: d.address.trim(),
        phone: d.phone.trim(),
        owner_name: d.ownerName.trim(),
        distributor: d.distributor.trim() || null,
        front_photo_url: storePaths[0] ?? null,
        latitude: p.gps.lat,
        longitude: p.gps.lng,
        register_status: storeStatus,
        baseline_status: "new",
        created_by: fid,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    storeId = (newStore as { id: string }).id;
  }

  const { error: vErr } = await supabase.from("visits").insert({
    store_id: storeId,
    fos_id: fid,
    visit_date: p.visitDate,
    register_status: storeStatus,
    visit_result: p.visitResult,
    selfie_url: selfiePath,
    store_photo_url: storePaths[0] ?? null,
    store_photo_url_2: storePaths[1] ?? null,
    activity_photo_url: activityPaths[0] ?? null,
    activity_photo_url_2: activityPaths[1] ?? null,
    latitude: p.gps.lat,
    longitude: p.gps.lng,
    notes: p.notes,
  });
  if (vErr) {
    // 23505 = unique violation (toko sudah dikunjungi di tanggal ini)
    if ((vErr as { code?: string }).code === "23505")
      throw new Error("VISIT_DUPLICATE");
    throw new Error(vErr.message);
  }
}
