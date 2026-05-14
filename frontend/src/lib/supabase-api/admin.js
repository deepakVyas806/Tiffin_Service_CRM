import { apiError, assertRole, getSettings, requireUser, supabase } from "./common";

export async function getAdminStats() {
  const user = await requireUser();
  assertRole(user, "admin");

  const [{ count: totalUsers }, { count: totalOrders }, { count: activeSubs }, { data: paidTxns }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("user_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("payment_transactions").select("amount").eq("payment_status", "paid"),
  ]);

  return {
    total_users: totalUsers || 0,
    total_orders: totalOrders || 0,
    active_subscriptions: activeSubs || 0,
    revenue: (paidTxns || []).reduce((sum, txn) => sum + Number(txn.amount || 0), 0),
  };
}

export async function listAdminUsers() {
  const user = await requireUser();
  assertRole(user, "admin");
  const { data, error } = await supabase.from("profiles").select("*").limit(500);
  if (error) throw apiError(error.message, 500);
  return data || [];
}

export async function listAdminOrders() {
  const user = await requireUser();
  assertRole(user, "admin");
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw apiError(error.message, 500);
  return data || [];
}

export async function getAdminSettings() {
  const user = await requireUser();
  assertRole(user, "admin");
  const s = await getSettings();
  return { cod_enabled: s.cod_enabled, delivery_zones: s.delivery_zones || [] };
}

export async function updateAdminSettings(body) {
  const user = await requireUser();
  assertRole(user, "admin");
  const { data, error } = await supabase
    .from("settings")
    .upsert({ id: "main", ...body })
    .select("*")
    .single();
  if (error) throw apiError(error.message, 500);
  return { cod_enabled: data.cod_enabled, delivery_zones: data.delivery_zones || [] };
}
