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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Ambil profil (role + nama) tiap sesi berubah.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setRole(null);
      setFullName(null);
      return;
    }
    supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", uid)
      .single()
      .then(({ data }) => {
        setRole((data as { role?: string } | null)?.role ?? "fos");
        setFullName((data as { full_name?: string } | null)?.full_name ?? null);
      });
  }, [session?.user?.id]);

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
