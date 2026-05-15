import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "../../utils/supabase/client";
import { api } from "./api";

const AuthContext = createContext(null);
const supabase = createClient();

function normalizeAuthError(error) {
  if (!error) return "Something went wrong.";
  return error.message || error.error_description || String(error);
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertProfile(authUser, payload = {}) {
  const profile = {
    id: authUser.id,
    email: authUser.email,
    full_name: payload.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Customer",
    phone: payload.phone || authUser.user_metadata?.phone || null,
    role: payload.role || "customer",
    address_summary: payload.address_summary || null,
    geo_lat: payload.geo_lat || null,
    geo_lng: payload.geo_lng || null,
    dietary_tags: payload.dietary_tags || [],
    wallet_balance: payload.wallet_balance ?? 0,
    free_meal_credit: payload.free_meal_credit ?? 1,
    onboarded: payload.onboarded ?? false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;

  return data;
}

function clearClientState() {
  if (typeof window === "undefined") return;
  window.localStorage.clear();
  window.sessionStorage.clear();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setUser(false);
        return;
      }
      const profile = await fetchProfile(data.user.id);
      setUser(profile || false);
    } catch (_) {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      refresh();
    });
    return () => listener.subscription.unsubscribe();
  }, [refresh]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(normalizeAuthError(error));
    let profile = await fetchProfile(data.user.id);
    if (!profile) profile = await upsertProfile(data.user);
    setUser(profile);
    return profile;
  };

  const register = async (payload) => {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.full_name,
          phone: payload.phone,
        },
      },
    });
    if (error) throw new Error(normalizeAuthError(error));
    if (!data.user) throw new Error("Registration did not return a user.");

    const profile = await upsertProfile(data.user, payload);
    setUser(profile);
    return profile;
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut({ scope: "global" });
    api.clearCache();
    clearClientState();
    setUser(false);
    setLoading(false);
  };

  const updateProfile = async (payload) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) throw new Error("Not authenticated");
    const updates = { ...payload };
    if (payload.dietary_tags !== undefined || payload.address_summary !== undefined) {
      updates.onboarded = true;
    }
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", authData.user.id)
      .select("*")
      .single();
    if (error) throw new Error(normalizeAuthError(error));
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong.";
  if (detail instanceof Error) return detail.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(" ");
  if (detail?.msg) return detail.msg;
  if (detail?.message) return detail.message;
  return String(detail);
}
