import { apiError, nowIso, newId, requireUser, supabase } from "./common";
import { activateSubscription } from "./subscriptions";

export async function fulfillPayment(sessionId) {
  const user = await requireUser();
  const { data: txn, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw apiError(error.message, 500);
  if (!txn) throw apiError("Transaction not found", 404);
  if (txn.user_id !== user.id && user.role !== "admin") throw apiError("Forbidden", 403);

  if (txn.payment_status !== "paid") {
    await supabase
      .from("payment_transactions")
      .update({ payment_status: "paid", status: "complete", updated_at: nowIso() })
      .eq("session_id", sessionId);

    if (txn.kind === "wallet_recharge") {
      const amount = Number(txn.amount);
      await supabase
        .from("profiles")
        .update({ wallet_balance: Number(user.wallet_balance || 0) + amount })
        .eq("id", txn.user_id);
      await supabase.from("wallet_transactions").insert({
        id: newId(),
        user_id: txn.user_id,
        type: "credit",
        amount,
        source: "stripe_recharge",
        note: "Wallet recharge",
        created_at: nowIso(),
      });
    } else if (txn.kind === "subscription") {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", txn.metadata?.plan_id || txn.plan_id)
        .maybeSingle();
      if (plan) await activateSubscription(txn.user_id, plan);
    } else if (txn.kind === "order") {
      await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", txn.metadata?.order_id || txn.order_id);
    }
  }

  const { data } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("session_id", sessionId)
    .single();
  return data;
}
