import { apiError, requireUser, supabase, nowIso } from "./common";
import { createNotification } from "./notifications";

export async function listAssignedOrders() {
  const user = await requireUser();
  if (!["delivery", "admin"].includes(user.role)) throw apiError("Forbidden", 403);

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw apiError(error.message, 500);
  return data || [];
}

export async function updateDeliveryStatus(body) {
  const user = await requireUser();
  if (!["delivery", "admin"].includes(user.role)) throw apiError("Forbidden", 403);

  const { data: order } = await supabase.from("orders").select("*").eq("id", body.order_id).maybeSingle();
  if (!order) throw apiError("Order not found", 404);

  const update = { status: body.status };
  if (body.status === "delivered") {
    if (order.payment_mode === "cod" && body.otp !== order.cod_otp) throw apiError("Invalid COD OTP");
    update.payment_status = "paid";
    update.delivered_at = nowIso();
  }

  await supabase.from("orders").update(update).eq("id", body.order_id);
  await createNotification(order.user_id, `Tiffin ${body.status.replaceAll("_", " ")}`, "Your order status was updated.", "delivery", { order_id: order.id });
  return { ok: true, status: body.status };
}
