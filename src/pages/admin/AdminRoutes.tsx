import { Link, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AdminNav } from "@/components/AdminNav";

import Dashboard from "@/pages/admin/Dashboard";
import Maps from "@/pages/admin/Maps";
import Visits from "@/pages/admin/Visits";
import VisitDetail from "@/pages/admin/VisitDetail";
import Stores from "@/pages/admin/Stores";
import StoreDetail from "@/pages/admin/StoreDetail";
import AddStore from "@/pages/admin/AddStore";
import UpdateVisits from "@/pages/admin/UpdateVisits";
import Users from "@/pages/admin/Users";

// Logo kecil untuk header admin.
function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-white/15 font-bold text-white shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      ABB
    </span>
  );
}

// Layout admin (header + nav) + rute bersarang di bawah /admin.
export default function AdminRoutes() {
  const { session, role, fullName, signOut } = useAuth();
  const superadmin = role === "superadmin";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 bg-brand text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <Logo size={34} />
            <div className="leading-tight">
              <p className="text-sm font-bold">ABB Star Reward</p>
              <p className="text-xs text-white/70">Admin Panel</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/90 sm:inline">
              {fullName || session?.user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="text-sm font-medium text-white/90 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl">
          <AdminNav superadmin={superadmin} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route index element={<Visits />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="maps" element={<Maps />} />
          <Route path="visits/:id" element={<VisitDetail />} />
          <Route path="stores" element={<Stores />} />
          <Route path="stores/new" element={<AddStore />} />
          <Route path="stores/:id" element={<StoreDetail />} />
          <Route path="kunjungan-update" element={<UpdateVisits />} />
          <Route path="users" element={<Users />} />
          <Route
            path="*"
            element={
              <p className="card px-3 py-10 text-center text-sm text-slate-400">
                Page not found.
              </p>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
