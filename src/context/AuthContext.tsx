import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  role: string | null;
  fullName: string | null;
  /** true selama sesi ATAU role belum selesai dimuat. */
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  session: null,
  role: null,
  fullName: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setSessionChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null);
      setSessionChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Ambil profil (role + nama) tiap sesi berubah.
  const uid = session?.user?.id;
  useEffect(() => {
    if (!uid) {
      setRole(null);
      setFullName(null);
      setRoleChecked(true); // tidak ada yang perlu dimuat
      return;
    }
    let active = true;
    setRoleChecked(false);
    supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", uid)
      .single()
      .then(({ data }) => {
        if (!active) return;
        setRole((data as { role?: string } | null)?.role ?? "fos");
        setFullName((data as { full_name?: string } | null)?.full_name ?? null);
        setRoleChecked(true);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  // Penting: selama role belum termuat, JANGAN putuskan arah/hak akses —
  // kalau tidak, admin sempat dianggap non-admin lalu dilempar ke halaman MD.
  const loading = !sessionChecked || (!!session && !roleChecked);

  const value = useMemo<AuthState>(
    () => ({
      session,
      role,
      fullName,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, role, fullName, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
