import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Visit from "@/pages/Visit";
import Riwayat from "@/pages/Riwayat";
import AdminRoutes from "@/pages/admin/AdminRoutes";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Area FOS (MD) — semua di dalam shell AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/visit" element={<Visit />} />
        <Route path="/riwayat" element={<Riwayat />} />
      </Route>

      {/* Area Admin */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute admin>
            <AdminRoutes />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
