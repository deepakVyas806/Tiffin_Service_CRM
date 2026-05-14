import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { motion } from "framer-motion";
import { CreditCard, Banknote, Wallet as WalletIcon, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";

export default function Checkout() {
  const { state } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("stripe");
  const [busy, setBusy] = useState(false);

  if (!state) return <Navigate to="/home" replace />;
  const { kind, amount, name, plan_id, menu_date } = state;

  const handlePay = async () => {
    setBusy(true);
    try {
      if (kind === "subscription") {
        const { data } = await api.post("/subscriptions/subscribe", {
          plan_id, payment_mode: mode, origin_url: window.location.origin,
        });
        if (mode === "stripe") { window.location.href = data.checkout_url; return; }
        toast.success("Subscription activated 🎉");
        navigate("/payment/success", { state: { kind, name, amount, mode } });
      } else {
        const { data } = await api.post("/orders/create", {
          menu_date, payment_mode: mode, origin_url: window.location.origin,
        });
        if (mode === "stripe") { window.location.href = data.checkout_url; return; }
        toast.success("Order placed");
        navigate("/payment/success", { state: { kind, name, amount, mode, order: data } });
      }
    } catch (e) {
      const detail = e.response?.data?.detail || "Payment failed";
      toast.error(typeof detail === "string" ? detail : "Payment failed");
    } finally { setBusy(false); }
  };

  const walletEnough = (user?.wallet_balance || 0) >= amount;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Checkout</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">{name}</h1>
          <div className="text-neutral-500 mt-1 text-sm">{kind === "subscription" ? "Subscription plan" : "One-time tiffin order"}</div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tf-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Amount to pay</span>
            <span className="font-display text-3xl font-bold">₹{amount}</span>
          </div>
        </motion.div>

        <div>
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500 mb-3">Payment method</div>
          <div className="space-y-2">
            <PayOption testid="pay-stripe" active={mode === "stripe"} onClick={() => setMode("stripe")} icon={CreditCard} title="UPI / Card / Net banking" subtitle="Secure online payment via Stripe" />
            <PayOption testid="pay-cod" active={mode === "cod"} onClick={() => setMode("cod")} icon={Banknote} title="Cash on delivery" subtitle="Pay when your tiffin arrives" badge="POPULAR" />
            <PayOption testid="pay-wallet" active={mode === "wallet"} disabled={!walletEnough} onClick={() => walletEnough && setMode("wallet")} icon={WalletIcon} title={`TiffinFlow wallet · ₹${user?.wallet_balance ?? 0}`} subtitle={walletEnough ? "Use your wallet balance" : "Insufficient balance"} />
          </div>
        </div>

        <motion.button
          data-testid="checkout-pay-button"
          disabled={busy}
          onClick={handlePay}
          whileTap={{ scale: 0.98 }}
          className="group w-full inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60 text-white font-semibold py-4 rounded-full"
        >
          {busy ? "Processing…" : (<>{mode === "cod" ? `Confirm — pay at delivery` : `Pay ₹${amount}`}  <ArrowRight size={16} className="transition group-hover:translate-x-1" /></>)}
        </motion.button>
      </div>
    </AppShell>
  );
}

function PayOption({ active, onClick, icon: Icon, title, subtitle, badge, disabled, testid }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className={`relative w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 ${
        active ? "border-orange-500 bg-orange-50/60" : "border-neutral-200 bg-white hover:border-neutral-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${active ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-700"}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold flex items-center gap-2">
          {title}
          {badge && <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{badge}</span>}
        </div>
        <div className="text-xs text-neutral-500">{subtitle}</div>
      </div>
      {active && (
        <span className="h-6 w-6 rounded-full bg-orange-500 text-white flex items-center justify-center">
          <Check size={14} />
        </span>
      )}
    </button>
  );
}
