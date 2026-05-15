import { apiError, getSettings, newId, nowIso, requireUser, supabase } from "./common";
import { getMealAvailability } from "./kitchen";

export async function createOrder(payload) {
  const user = await requireUser();
  const mealType = payload.meal_type || "lunch";
  const availability = await getMealAvailability(payload.menu_date, mealType);
  if (!availability.available) throw apiError(availability.reason || "Kitchen is closed for this meal");

  if (Number(user.free_meal_credit || 0) > 0 && payload.payment_mode !== "subscription") {
    const { data: orderId, error } = await supabase.rpc("consume_free_meal_credit", {
      p_menu_date: payload.menu_date,
      p_meal_type: mealType,
    });
    if (error) throw apiError(error.message, 500);
    return getOrder(orderId);
  }

  if (payload.tracking_id || payload.payment_mode === "subscription") {
    const trackingId = payload.tracking_id || await findActiveTracking(user.id, payload.menu_date, mealType);
    if (!trackingId) throw apiError("No active subscription meal available for this date");
    const { data: orderId, error } = await supabase.rpc("consume_subscription_meal", {
      p_tracking_id: trackingId,
    });
    if (error) throw apiError(error.message, 500);
    return getOrder(orderId);
  }

  const mealPrice = 149;
  const order = {
    id: newId(),
    user_id: user.id,
    order_type: "one_time",
    menu_date: payload.menu_date,
    amount: mealPrice,
    address: payload.address || user.address_summary,
    notes: payload.notes || null,
    status: "preparing",
    created_at: nowIso(),
  };

  if (payload.payment_mode === "cod") {
    const settings = await getSettings();
    if (!settings.cod_enabled) throw apiError("Cash on delivery is currently disabled");
    order.payment_mode = "cod";
    order.payment_status = "cod_pending";
    order.cod_otp = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    return insertOrder(order);
  }

  if (payload.payment_mode === "wallet") {
    if ((user.wallet_balance || 0) < mealPrice) throw apiError("Insufficient wallet balance");
    await supabase.from("profiles").update({ wallet_balance: Number(user.wallet_balance) - mealPrice }).eq("id", user.id);
    await supabase.from("wallet_transactions").insert({
      id: newId(),
      user_id: user.id,
      type: "debit",
      amount: mealPrice,
      source: "order",
      note: "One-time tiffin order",
      created_at: nowIso(),
    });
    order.payment_mode = "wallet";
    order.payment_status = "paid";
    return insertOrder(order);
  }

  const sessionId = `local_${newId().replaceAll("-", "")}`;
  order.payment_mode = "stripe";
  order.payment_status = "initiated";
  order.stripe_session_id = sessionId;
  const { error } = await supabase.from("orders").insert(order);
  if (error) throw apiError(error.message, 500);

  await supabase.from("payment_transactions").insert({
    id: newId(),
    session_id: sessionId,
    user_id: user.id,
    amount: mealPrice,
    currency: "inr",
    kind: "order",
    order_id: order.id,
    payment_status: "initiated",
    status: "pending",
    metadata: { order_id: order.id },
    created_at: nowIso(),
  });
  const origin = payload.origin_url || window.location.origin;
  return { order_id: order.id, session_id: sessionId, checkout_url: `${origin}/payment/success?session_id=${sessionId}` };
}

async function findActiveTracking(userId, date, mealType) {
  const { data, error } = await supabase
    .from("subscription_tracking")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("meal_type", mealType)
    .eq("status", "active")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw apiError(error.message, 500);
  return data?.id || null;
}

export async function listMyOrders() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw apiError(error.message, 500);
  return data || [];
}

export async function getOrder(orderId) {
  const user = await requireUser();
  const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw apiError(error.message, 500);
  if (!data) throw apiError("Order not found", 404);
  if (data.user_id !== user.id && !["admin", "super_admin", "delivery", "delivery_staff"].includes(user.role)) throw apiError("Forbidden", 403);
  return data;
}

export async function trackOrder(orderId) {
  const order = await getOrder(orderId);
  return { order, timeline: buildTimeline(order) };
}

async function insertOrder(order) {
  const { data, error } = await supabase.from("orders").insert(order).select("*").single();
  if (error) throw apiError(error.message, 500);
  return data;
}

function buildTimeline(order) {
  return [
    { key: "preparing", label: "Preparing in kitchen", state: order.status === "preparing" ? "active" : "done" },
    { key: "out_for_delivery", label: "Out for delivery", state: order.status === "out_for_delivery" ? "active" : order.status === "delivered" ? "done" : "pending" },
    { key: "delivered", label: "Delivered", state: order.status === "delivered" ? "done" : "pending" },
  ];
}
