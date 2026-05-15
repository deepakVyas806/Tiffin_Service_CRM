import { createClient } from "../../../utils/supabase/client";

export const supabase = createClient();

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const nowIso = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

export function apiError(detail, status = 400) {
  const error = new Error(typeof detail === "string" ? detail : "Request failed");
  error.response = { status, data: { detail } };
  return error;
}

export async function requireUser() {
  const { data: authData, error } = await supabase.auth.getUser();
  if (error || !authData?.user) throw apiError("Not authenticated", 401);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) throw apiError(profileError.message, 500);
  if (!profile) throw apiError("User profile not found", 401);
  return profile;
}

export function assertRole(user, role) {
  const adminRoles = ["admin", "super_admin"];
  if (role === "admin" && !adminRoles.includes(user.role)) {
    throw apiError("Forbidden", 403);
  }
  if (role === "delivery" && !["delivery", "delivery_staff", ...adminRoles].includes(user.role)) {
    throw apiError("Forbidden", 403);
  }
  if (!["admin", "delivery"].includes(role) && user.role !== role && !adminRoles.includes(user.role)) {
    throw apiError("Forbidden", 403);
  }
}

export function assertAnyRole(user, roles = []) {
  if (!roles.includes(user.role)) {
    throw apiError("Forbidden", 403);
  }
}

export async function getSettings() {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error) throw apiError(error.message, 500);
  return data || { id: "main", cod_enabled: true, delivery_zones: [] };
}
