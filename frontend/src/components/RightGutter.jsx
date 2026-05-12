import { Wallet, Truck, Sparkles, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Link } from "react-router-dom";

export default function RightGutter() {
  const [balance, setBalance] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [b, s, o] = await Promise.all([
          api.get("/wallet/balance"),
          api.get("/subscriptions/active"),
          api.get("/orders/mine"),
        ]);
        setBalance(b.data.balance);
        setActiveSub(s.data || null);
        setOrders(o.data.slice(0, 3));
      } catch (_) {}
    })();
  }, []);

  return (
    <aside data-testid="right-gutter" className="hidden lg:flex lg:flex-col fixed right-0 top-0 bottom-0 w-80 px-6 py-8 overflow-y-auto border-l border-black/5 bg-white/40">
      <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-neutral-500 mb-3">Wallet</div>
      <Link to="/wallet" data-testid="gutter-wallet" className="block p-5 rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <Wallet size={20} />
          <ChevronRight size={16} className="opacity-80" />
        </div>
        <div className="mt-6 text-xs opacity-90">Available balance</div>
        <div className="font-display text-3xl font-bold">₹{balance ?? "—"}</div>
      </Link>

      <div className="mt-8 text-[10px] uppercase tracking-[0.15em] font-bold text-neutral-500 mb-3">Subscription</div>
      <div className="tf-card p-5">
        {activeSub ? (
          <>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-orange-600" />
              <span className="text-sm font-semibold">{activeSub.plan_name}</span>
            </div>
            <div className="mt-4 text-3xl font-display font-bold">{activeSub.meals_left}</div>
            <div className="text-xs text-neutral-500">meals remaining</div>
            <div className="mt-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${(activeSub.meals_left / activeSub.total_meals) * 100}%` }} />
            </div>
            <div className="mt-3 text-xs text-neutral-500">Valid till {activeSub.expires_at}</div>
          </>
        ) : (
          <Link to="/plans" className="block text-center text-sm font-semibold text-orange-600">No active plan — Browse plans →</Link>
        )}
      </div>

      <div className="mt-8 text-[10px] uppercase tracking-[0.15em] font-bold text-neutral-500 mb-3">Upcoming deliveries</div>
      <div className="space-y-2">
        {orders.length === 0 && <div className="text-sm text-neutral-500">No deliveries yet</div>}
        {orders.map((o) => (
          <div key={o.id} className="tf-card p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center">
              <Truck size={16} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold capitalize">{o.status.replaceAll("_", " ")}</div>
              <div className="text-xs text-neutral-500">{o.menu_date}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
