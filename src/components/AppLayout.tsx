import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { OfflineSync } from "@/components/OfflineSync";

// Shell area FOS (MD): header brand + antrian offline + isi halaman.
export default function AppLayout() {
  const { session, fullName, role } = useAuth();
  const name = fullName || session?.user?.email;
  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-brand-900/30 bg-brand text-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <div className="leading-tight">
              <p className="text-sm font-bold">ABB Star Reward</p>
              <p className="max-w-[150px] truncate text-xs text-white/70">
                {name}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="px-4 py-5">
        <OfflineSync />
        {/* Admin yang mendarat di halaman MD tetap punya jalan ke panel admin. */}
        {isAdmin && (
          <Link
            to="/admin/dashboard"
            className="mb-4 flex items-center justify-between rounded-xl border border-brand/30 bg-white px-4 py-3 text-sm font-semibold text-brand shadow-sm transition hover:bg-brand/5"
          >
            Buka Panel Admin
            <span aria-hidden>›</span>
          </Link>
        )}
        <Outlet />
      </main>
    </div>
  );
}
