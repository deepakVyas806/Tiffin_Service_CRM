import { apiError, getSettings, newId, nowIso, requireUser, supabase } from "./common";
import { createNotification } from "./notifications";

export async function activateSubscription(userId, plan, paymentStatus = "paid") {
  const start = new Date();
  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + Number(plan.validity_days || 0));

  const sub = {
    id: newId(),
    user_id: userId,
    plan_id: plan.id,
    plan_name: plan.name,
    meals_left: plan.meal_count,
    total_meals: plan.meal_count,
    starts_at: start.toISOString().slice(0, 10),
    expires_at: expiry.toISOString().slice(0, 10),
    paused_dates: [],
    delivered_dates: [],
    status: "active",
    payment_status: paymentStatus,
    created_at: nowIso(),
  };
  const { data, error } = await supabase.from("user_subscriptions").insert(sub).select("*").single();
  if (error) throw apiError(error.message, 500);
  return data;
}

export async function subscribe(payload) {
  const user = await requireUser();
  const { data: plan, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", payload.plan_id)
    .single();
  if (error || !plan) throw apiError("Plan not found", 404);

  if (payload.payment_mode === "cod") {
    const settings = await getSettings();
    if (!settings.cod_enabled) throw apiError("Cash on delivery is currently disabled");
    const sub = await activateSubscription(user.id, plan, "cod_pending");
    await createNotification(user.id, "Subscription activated", `${plan.name} starts today. We'll collect cash on first delivery.`, "success", { sub_id: sub.id });
    return { status: "active", subscription: sub, cod: true };
  }

  if (payload.payment_mode === "wallet") {
    if ((user.wallet_balance || 0) < plan.price) throw apiError("Insufficient wallet balance");
    await supabase.from("profiles").update({ wallet_balance: Number(user.wallet_balance) - Number(plan.price) }).eq("id", user.id);
    await supabase.from("wallet_transactions").insert({
      id: newId(),
      user_id: user.id,
      type: "debit",
      amount: plan.price,
      source: "subscription",
      note: `Subscribed to ${plan.name}`,
      created_at: nowIso(),
    });
    const sub = await activateSubscription(user.id, plan);
    await createNotification(user.id, "Subscription activated", `${plan.name} starts today. Enjoy your meals!`, "success", { sub_id: sub.id });
    return { status: "active", subscription: sub };
  }

  const sessionId = `local_${newId().replaceAll("-", "")}`;
  await supabase.from("payment_transactions").insert({
    id: newId(),
    session_id: sessionId,
    user_id: user.id,
    amount: plan.price,
    currency: "inr",
    kind: "subscription",
    plan_id: plan.id,
    payment_status: "initiated",
    status: "pending",
    metadata: { plan_id: plan.id },
    created_at: nowIso(),
  });
  const origin = payload.origin_url || window.location.origin;
  return { session_id: sessionId, checkout_url: `${origin}/payment/success?session_id=${sessionId}` };
}

export async function listMySubscriptions() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw apiError(error.message, 500);
  return data || [];
}

export async function getActiveSubscription() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw apiError(error.message, 500);
  return data;
}

export async function setSubscriptionPaused(subscriptionId, date, paused) {
  const user = await requireUser();
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub) throw apiError("Subscription not found", 404);

  const pausedDates = new Set(sub.paused_dates || []);
  if (paused) pausedDates.add(date);
  else pausedDates.delete(date);

  await supabase
    .from("user_subscriptions")
    .update({ paused_dates: Array.from(pausedDates) })
    .eq("id", sub.id);

  return { ok: true, extended: paused };
}
