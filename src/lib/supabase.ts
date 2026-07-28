import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Kalau env var belum di-set saat build, tampilkan pesan jelas di layar
// (bukan layar putih) supaya gampang didiagnosa saat deploy.
export const envError: string | null =
  !url || !key
    ? `Konfigurasi belum lengkap. Environment variable berikut kosong saat build: ${[
        !url && "VITE_SUPABASE_URL",
        !key && "VITE_SUPABASE_ANON_KEY",
      ]
        .filter(Boolean)
        .join(", ")}.`
    : null;

// Client Supabase tunggal untuk seluruh app (SPA, auth di client via localStorage).
// Pakai placeholder kalau env kosong agar createClient tidak melempar error
// sebelum pesan di atas sempat ditampilkan.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
