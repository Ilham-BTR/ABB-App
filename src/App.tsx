import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";

// Placeholder sementara untuk halaman yang belum di-port.
function Soon({ title }: { title: string }) {
  return (
    <div className="p-8 text-center text-slate-500">
      <h1 className="text-lg font-bold text-slate-700">{title}</h1>
      <p className="mt-1 text-sm">Halaman ini sedang dipindahkan…</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Area FOS (MD) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Soon title="Home" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/visit"
        element={
          <ProtectedRoute>
            <Soon title="Kunjungan" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/riwayat"
        element={
          <ProtectedRoute>
            <Soon title="Riwayat" />
          </ProtectedRoute>
        }
      />

      {/* Area Admin */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute admin>
            <Soon title="Admin Panel" />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
