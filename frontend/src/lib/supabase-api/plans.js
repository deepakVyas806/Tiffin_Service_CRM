import { apiError, assertRole, newId, requireUser, supabase } from "./common";

export async function listPlans() {
  const { data, error } = await supabase.from("subscription_plans").select("*").order("price");
  if (error) throw apiError(error.message, 500);
  return data || [];
}

export async function listAdminPlans() {
  const user = await requireUser();
  assertRole(user, "admin");
  return listPlans();
}

export async function createPlan(body) {
  const user = await requireUser();
  assertRole(user, "admin");
  const plan = { id: newId(), meal_type: "lunch", plan_interval: "weekly", ...body };
  const { data, error } = await supabase.from("subscription_plans").insert(plan).select("*").single();
  if (error) throw apiError(error.message, 500);
  return data;
}

export async function upsertPlan(planId, body) {
  const user = await requireUser();
  assertRole(user, "admin");
  const { data, error } = await supabase
    .from("subscription_plans")
    .upsert({ meal_type: "lunch", plan_interval: "weekly", ...body, id: planId })
    .select("*")
    .single();
  if (error) throw apiError(error.message, 500);
  return data;
}

export async function deletePlan(planId) {
  const user = await requireUser();
  assertRole(user, "admin");
  await supabase.from("subscription_plans").delete().eq("id", planId);
  return { ok: true };
}
