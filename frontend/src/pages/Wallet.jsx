import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { motion } from "framer-motion";
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "../components/ui/drawer";

const QUICK = [100, 500, 1000, 2500];

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [b, t] = await Promise.all([api.get("/wallet/balance"), api.get("/wallet/transactions")]);
    setBalance(b.data.balance);
    setTxns(t.data);
  };

  const recharge = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/wallet/recharge", { amount, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error("Could not start recharge"); }
    finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/20">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-8 -bottom-12 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm opacity-90"><WalletIcon size={16} /> TiffinFlow Wallet</div>
            <div className="mt-6 text-sm opacity-80">Available balance</div>
            <div data-testid="wallet-balance" className="font-display text-5xl font-bold tracking-tight mt-1">₹{balance}</div>
            <button data-testid="wallet-add-money" onClick={() => setOpen(true)} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-orange-700 font-semibold text-sm shadow">
              <Plus size={16} /> Add money
            </button>
          </div>
        </motion.div>

        <div>
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500 mb-3">Transactions</div>
          {txns.length === 0 ? (
            <div className="tf-card p-6 text-center text-sm text-neutral-500">No transactions yet.</div>
          ) : (
            <div className="space-y-2">
              {txns.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="tf-card p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${t.type === "credit" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>
                    {t.type === "credit" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.note || t.source}</div>
                    <div className="text-xs text-neutral-500">{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                  <div className={`text-sm font-bold ${t.type === "credit" ? "text-green-600" : "text-neutral-900"}`}>
                    {t.type === "credit" ? "+" : "−"}₹{t.amount}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-white">
          <DrawerTitle className="sr-only">Add money</DrawerTitle>
          <DrawerDescription className="sr-only">Choose recharge amount</DrawerDescription>
          <div className="p-6 pb-10 max-w-md mx-auto">
            <h2 className="font-display text-2xl font-bold">Add to wallet</h2>
            <p className="text-sm text-neutral-500 mt-1">Pay via UPI, card, or net banking.</p>
            <div className="mt-6 grid grid-cols-4 gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  data-testid={`wallet-quick-${q}`}
                  onClick={() => setAmount(q)}
                  className={`py-3 rounded-2xl text-sm font-bold transition ${amount === q ? "bg-orange-600 text-white" : "bg-orange-50 text-orange-700"}`}
                >
                  ₹{q}
                </button>
              ))}
            </div>
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">Or enter amount</div>
              <div className="mt-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-neutral-500">₹</span>
                <input
                  data-testid="wallet-custom-amount"
                  type="number" min={50} max={50000} value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
                  className="w-full pl-9 pr-4 py-3.5 rounded-2xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <button data-testid="wallet-recharge-submit" disabled={busy || amount < 50} onClick={recharge} className="mt-6 w-full py-4 rounded-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold">
              {busy ? "Redirecting…" : `Pay ₹${amount}`}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}
