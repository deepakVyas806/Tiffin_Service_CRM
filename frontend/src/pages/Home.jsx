import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles, Pause, Flame, Leaf, Truck, ArrowRight, ChevronRight, CalendarDays } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [today, setToday] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [orders, setOrders] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, s, o, b] = await Promise.all([
          api.get("/menu/today"),
          api.get("/subscriptions/active"),
          api.get("/orders/mine"),
          api.get("/wallet/balance"),
        ]);
        setToday(t.data);
        setActiveSub(s.data || null);
        setOrders(o.data);
        setBalance(b.data.balance);
      } finally { setLoading(false); }
    })();
  }, []);

  const orderOneTime = () => navigate("/checkout", { state: { kind: "order", menu_date: today?.date, amount: 149, name: today?.main_dish || "One-time tiffin" } });

  const pauseToday = async () => {
    if (!activeSub) return;
    try {
      await api.post("/subscriptions/pause", { subscription_id: activeSub.id, date: new Date().toISOString().slice(0, 10) });
      toast.success("Today's tiffin paused");
      const s = await api.get("/subscriptions/active"); setActiveSub(s.data);
    } catch (e) { toast.error("Could not pause"); }
  };

  return (
    <AppShell>
      <div className="space-y-6 md:space-y-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Today</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">
            Hi, {user?.full_name?.split(" ")[0] || "there"} <span className="inline-block">👋</span>
          </h1>
        </div>

        {/* Today's tiffin card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 border border-orange-100 p-6">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-200/40 blur-3xl" />
          <div className="absolute -right-6 -bottom-12 h-44 w-44 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="relative flex gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-orange-700 border border-orange-100">
                <Flame size={11} /> Today's tiffin
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight mt-3 leading-tight">{loading ? "Loading…" : today?.main_dish}</h2>
              <p className="text-sm text-neutral-600 mt-1.5">{(today?.sides || []).join(" · ")}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(today?.tags || []).map((t) => (
                  <span key={t} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/70 backdrop-blur border border-orange-100 text-neutral-700">{t.replaceAll('_', ' ')}</span>
                ))}
              </div>
              <div className="mt-5 flex gap-2 flex-wrap">
                <button data-testid="home-order-onetime" onClick={orderOneTime} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-neutral-900 text-white text-sm font-semibold">
                  Order today's <ArrowRight size={14} />
                </button>
                {activeSub && (
                  <button data-testid="home-pause-today" onClick={pauseToday} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur border border-black/5 text-sm font-semibold">
                    <Pause size={14} /> Pause today
                  </button>
                )}
              </div>
            </div>
            <div className="hidden sm:block w-32 h-32 rounded-2xl overflow-hidden tf-card flex-shrink-0">
              {today?.image_url ? <img src={today.image_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-orange-100 flex items-center justify-center"><Leaf className="text-orange-600" /></div>}
            </div>
          </div>
        </motion.div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          <StatCard label="Wallet" value={`₹${balance ?? "—"}`} testid="home-stat-wallet" onClick={() => navigate("/wallet")} accent="text-orange-600" />
          <StatCard label="Meals left" value={activeSub?.meals_left ?? "0"} testid="home-stat-meals" onClick={() => navigate("/calendar")} accent="text-green-600" />
        </div>

        {/* Subscription banner */}
        {activeSub ? (
          <Link to="/calendar" data-testid="home-sub-card" className="block tf-card p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-green-50 flex items-center justify-center"><Sparkles size={20} className="text-green-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{activeSub.plan_name}</div>
                <div className="text-xs text-neutral-500">{activeSub.meals_left}/{activeSub.total_meals} meals remaining · Till {activeSub.expires_at}</div>
              </div>
              <ChevronRight size={18} className="text-neutral-400" />
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${(activeSub.meals_left / activeSub.total_meals) * 100}%` }} />
            </div>
          </Link>
        ) : (
          <Link to="/plans" data-testid="home-no-sub" className="block rounded-3xl border-2 border-dashed border-orange-200 p-6 text-center bg-white/40 hover:bg-white transition">
            <Sparkles className="mx-auto text-orange-500" />
            <div className="mt-3 font-display text-lg font-bold">Start a subscription</div>
            <div className="text-sm text-neutral-500 mt-1">Save more, pause anytime, never miss a meal.</div>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600">Browse plans <ArrowRight size={14} /></div>
          </Link>
        )}

        {/* Recent deliveries */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-xl font-bold tracking-tight">Recent deliveries</h3>
            <Link to="/calendar" className="text-xs font-semibold text-orange-600">View all</Link>
          </div>
          {orders.length === 0 ? (
            <div className="tf-card p-6 text-center text-sm text-neutral-500">No deliveries yet. Order your first tiffin above.</div>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 4).map((o) => (
                <div key={o.id} className="tf-card p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${o.status === "delivered" ? "bg-green-50" : "bg-orange-50"}`}>
                    {o.status === "delivered" ? <CalendarDays size={18} className="text-green-600" /> : <Truck size={18} className="text-orange-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold capitalize truncate">{o.status.replaceAll("_", " ")}</div>
                    <div className="text-xs text-neutral-500">{o.menu_date} · {o.payment_mode?.toUpperCase()}</div>
                  </div>
                  <div className="text-sm font-bold">₹{o.amount}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, testid, onClick, accent }) {
  return (
    <button data-testid={testid} onClick={onClick} className="tf-card p-4 text-left active:scale-[0.98] transition">
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1 ${accent}`}>{value}</div>
    </button>
  );
}
