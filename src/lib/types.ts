// Tipe data domain FOS MOBILE — mencerminkan skema tabel di Supabase.

export type RegisterStatus =
  | "sudah_aktif"
  | "sudah_belum_aktif"
  | "new"
  | "no"
  | "decline"
  | "follow_up"
  | "other";

export const REGISTER_STATUS_OPTIONS: { value: RegisterStatus; label: string }[] = [
  { value: "sudah_aktif", label: "Yes, Active" },
  { value: "sudah_belum_aktif", label: "Yes, Inactive" },
  { value: "new", label: "New" },
  { value: "no", label: "No" },
  { value: "decline", label: "Decline" },
  { value: "follow_up", label: "Follow-up" },
  { value: "other", label: "Other" },
];

export function registerStatusLabel(value: string | null): string {
  if (!value) return "-";
  return REGISTER_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

// "Yes, Active" = status FINAL. Toko yang sudah aktif tidak dikunjungi lagi
// oleh MD; hanya admin yang boleh mengubahnya (mis. koreksi salah input).
export const FINAL_STATUS: RegisterStatus = "sudah_aktif";

export function isFinalStatus(value: string | null | undefined): boolean {
  return value === FINAL_STATUS;
}

// Warna (hex) per status — dipakai di Coverage Map & legend dashboard.
export const STATUS_COLOR: Record<string, string> = {
  sudah_aktif: "#16a34a",
  sudah_belum_aktif: "#d97706",
  new: "#2563eb",
  no: "#6b7280",
  decline: "#dc2626",
  follow_up: "#4f46e5",
  other: "#64748b",
};

// Warna (hex) per Visit Result — dipakai di grafik dashboard.
export const VISIT_RESULT_COLOR: Record<string, string> = {
  yes_active: "#16a34a",
  yes_inactive: "#d97706",
  decline: "#dc2626",
  follow_up: "#4f46e5",
  other: "#64748b",
};

// Visit Result = hasil kunjungan yang diisi MD tiap visit.
export type VisitResult =
  | "yes_active"
  | "yes_inactive"
  | "decline"
  | "follow_up"
  | "other";

export const VISIT_RESULT_OPTIONS: { value: VisitResult; label: string }[] = [
  { value: "yes_active", label: "Yes, Active" },
  { value: "yes_inactive", label: "Yes, Inactive" },
  { value: "decline", label: "Decline" },
  { value: "follow_up", label: "Follow-up" },
  { value: "other", label: "Other" },
];

export function visitResultLabel(value: string | null): string {
  if (!value) return "-";
  return VISIT_RESULT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

// Kebalikannya: label Excel ("Yes, Active" / "Follow-up" / dst) -> enum VisitResult.
export function visitResultFromLabel(label: string): VisitResult | null {
  const s = label.trim().toLowerCase();
  if (!s) return null;
  const exact = VISIT_RESULT_OPTIONS.find((o) => o.label.toLowerCase() === s);
  if (exact) return exact.value;
  // Toleransi variasi penulisan.
  if (s.includes("inactive")) return "yes_inactive";
  if (s.includes("active")) return "yes_active";
  if (s.startsWith("decline")) return "decline";
  if (s.startsWith("follow")) return "follow_up";
  if (s.startsWith("other")) return "other";
  return null;
}

// Petakan Visit Result -> Status Register Program toko (1:1).
// Status Sekarang toko = hasil kunjungan terakhir (apa pun).
export function registerStatusFromResult(result: VisitResult): RegisterStatus {
  switch (result) {
    case "yes_active":
      return "sudah_aktif";
    case "yes_inactive":
      return "sudah_belum_aktif";
    case "decline":
      return "decline";
    case "follow_up":
      return "follow_up";
    case "other":
      return "other";
  }
}

// Peringkat status (dipertahankan untuk kompatibilitas; tidak dipakai lagi
// karena status kini selalu = hasil kunjungan terakhir).
const STATUS_RANK: Record<string, number> = {
  new: 0,
  no: 0,
  decline: 1,
  follow_up: 1,
  other: 1,
  sudah_belum_aktif: 2,
  sudah_aktif: 3,
};

// Status toko ter-update ke hasil terbaru, TAPI tidak boleh turun:
// ambil status dengan peringkat tertinggi antara sekarang & hasil baru.
export function higherStatus(
  current: string | null,
  next: RegisterStatus
): RegisterStatus {
  if (!current) return next;
  const cur = STATUS_RANK[current] ?? -1;
  const nxt = STATUS_RANK[next] ?? -1;
  return nxt >= cur ? next : (current as RegisterStatus);
}

// Petakan teks "Status di Star Reward" dari Excel ke enum register status.
// Yes active -> sudah_aktif · Yes inactive -> sudah_belum_aktif
// No = ada di database tapi belum terdaftar -> no
// (decline = menolak saat dikunjungi; new = toko tak ada di database)
export function statusFromExcel(raw: string): RegisterStatus | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("inactive")) return "sudah_belum_aktif";
  if (s.includes("active")) return "sudah_aktif";
  if (s.startsWith("no")) return "no";
  return null;
}

export type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

export type Store = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  owner_name: string | null;
  distributor: string | null;
  front_photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  register_status: string | null; // status terkini toko
  baseline_status: string | null; // status awal (dari import) — tidak berubah
  created_by: string | null;
  created_at: string;
};

export type Visit = {
  id: string;
  store_id: string;
  fos_id: string;
  visit_date: string;
  register_status: RegisterStatus;
  visit_result: VisitResult | null;
  selfie_url: string | null;
  store_photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_at: string;
};

// Bentuk row visit yang sudah di-join dengan nama toko (untuk daftar riwayat).
export type VisitWithStore = Visit & {
  stores: Pick<Store, "name"> | null;
};
