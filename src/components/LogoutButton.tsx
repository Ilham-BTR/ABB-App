import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function LogoutButton() {
  const nav = useNavigate();
  const { signOut } = useAuth();

  async function logout() {
    await signOut();
    nav("/login", { replace: true });
  }

  return (
    <button
      onClick={logout}
      className="text-sm font-medium text-white/90 hover:text-white"
    >
      Keluar
    </button>
  );
}
