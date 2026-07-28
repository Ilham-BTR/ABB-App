import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { role } = useAuth();

  // Admin/superadmin yang membuka "/" langsung diarahkan ke panel admin
  // (mis. saat sesi masih tersimpan, jadi tidak lewat halaman login).
  if (role === "admin" || role === "superadmin")
    return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="space-y-3">
      <h2 className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Menu
      </h2>

      <Link
        to="/visit"
        className="group flex items-center gap-4 rounded-2xl bg-brand p-5 text-white shadow-soft transition active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-2xl">
          📋
        </span>
        <span className="flex-1">
          <span className="block text-lg font-semibold">Kunjungan Toko</span>
          <span className="block text-sm text-white/70">
            Catat kunjungan toko terdaftar / baru
          </span>
        </span>
        <span className="text-2xl text-white/70 transition group-hover:translate-x-0.5">
          ›
        </span>
      </Link>

      <Link
        to="/riwayat"
        className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-card transition active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-2xl">
          🗂️
        </span>
        <span className="flex-1">
          <span className="block text-lg font-semibold">Riwayat Kunjungan</span>
          <span className="block text-sm text-slate-400">
            Lihat kunjungan yang sudah dicatat
          </span>
        </span>
        <span className="text-2xl text-slate-300 transition group-hover:translate-x-0.5">
          ›
        </span>
      </Link>
    </div>
  );
}
