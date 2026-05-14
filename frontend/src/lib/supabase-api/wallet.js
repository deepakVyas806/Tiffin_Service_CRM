import { apiError, newId, nowIso, requireUser, supabase } from "./common";

export async function getWalletBalance() {
  const user = await requireUser();
  return { balance: user.wallet_balance || 0 };
}

export async function listWalletTransactions() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw apiError(error.message, 500);
  return data || [];
}

export async function rechargeWallet(body) {
  const user = await requireUser();
  if (body.amount < 50 || body.amount > 50000) {
    throw apiError("Amount must be between 50 and 50000");
  }

  const sessionId = `local_${newId().replaceAll("-", "")}`;
  await supabase.from("payment_transactions").insert({
    id: newId(),
    session_id: sessionId,
    user_id: user.id,
    amount: body.amount,
    currency: "inr",
    kind: "wallet_recharge",
    payment_status: "initiated",
    status: "pending",
    metadata: { amount: String(body.amount) },
    created_at: nowIso(),
  });

  return {
    checkout_url: `${body.origin_url}/payment/success?session_id=${sessionId}`,
    session_id: sessionId,
  };
}
