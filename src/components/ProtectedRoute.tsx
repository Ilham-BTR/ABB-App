import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Guard rute: wajib login. `admin` = wajib role admin/superadmin.
export function ProtectedRoute({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const { session, role, loading } = useAuth();

  if (loading)
    return (
      <div className="flex h-full items-center justify-center p-10 text-sm text-slate-400">
        Memuat…
      </div>
    );
  if (!session) return <Navigate to="/login" replace />;
  if (admin && role !== "admin" && role !== "superadmin")
    return <Navigate to="/" replace />;
  return <>{children}</>;
}
