import { useEffect, useState } from "react";
import { useSearchParams, useLocation, useNavigate, Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { motion } from "framer-motion";
import { Check, ArrowRight, Hourglass, X } from "lucide-react";
import confetti from "canvas-confetti";

export default function PaymentSuccess() {
  const [search] = useSearchParams();
  const { state } = useLocation();
  const sessionId = search.get("session_id");
  const navigate = useNavigate();
  const [status, setStatus] = useState(state?.mode === "stripe" ? "polling" : "paid");
  const [txn, setTxn] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      // came from wallet/cod success
      fireConfetti();
      return;
    }
    let attempts = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        setTxn(data);
        if (data.payment_status === "paid") {
          setStatus("paid"); fireConfetti(); return;
        }
        if (data.status === "expired") { setStatus("failed"); return; }
        if (attempts++ < 8) setTimeout(poll, 2000);
        else setStatus("timeout");
      } catch { setStatus("failed"); }
    };
    poll();
  }, [sessionId]);

  function fireConfetti() {
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.4 }, colors: ["#EA580C","#16A34A","#F59E0B","#FBBF24"] });
  }

  return (
    <AppShell hideGutter>
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          {status === "paid" && (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={36} className="text-green-600" />
              </motion.div>
              <h1 data-testid="payment-success-title" className="font-display text-3xl font-bold tracking-tight mt-6">Payment successful</h1>
              <p className="text-neutral-500 mt-2">{state?.name ? `${state.name} is now yours.` : "Your transaction is complete."}</p>
              <Link to="/home" data-testid="payment-success-home" className="mt-8 inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-7 py-3.5 rounded-full font-semibold">
                Go to home <ArrowRight size={16} />
              </Link>
            </>
          )}
          {status === "polling" && (
            <>
              <div className="mx-auto h-20 w-20 rounded-full bg-orange-50 flex items-center justify-center"><Hourglass size={28} className="text-orange-600 tf-pulse" /></div>
              <h1 className="font-display text-2xl font-bold mt-6">Confirming payment…</h1>
              <p className="text-neutral-500 mt-2">This usually takes a few seconds.</p>
            </>
          )}
          {(status === "failed" || status === "timeout") && (
            <>
              <div className="mx-auto h-20 w-20 rounded-full bg-red-50 flex items-center justify-center"><X size={28} className="text-red-600" /></div>
              <h1 className="font-display text-2xl font-bold mt-6">We couldn't confirm your payment</h1>
              <p className="text-neutral-500 mt-2">If money was deducted it will be refunded automatically.</p>
              <button onClick={() => navigate(-2)} className="mt-6 px-6 py-3 rounded-full bg-neutral-900 text-white font-semibold">Try again</button>
            </>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
