import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { motion } from "framer-motion";
import { Pause, Play, Sparkles, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function CalendarPage() {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchSub(); }, []);

  const fetchSub = async () => {
    setLoading(true);
    const { data } = await api.get("/subscriptions/active");
    setSub(data || null);
    setLoading(false);
  };

  const togglePause = async (date) => {
    if (!sub) return;
    setBusy(true);
    try {
      const isPaused = sub.paused_dates?.includes(date);
      if (isPaused) {
        await api.post("/subscriptions/resume", { subscription_id: sub.id, date });
        toast.success("Resumed");
      } else {
        const { data } = await api.post("/subscriptions/pause", { subscription_id: sub.id, date });
        toast.success(data.extended ? "Paused — meal credit extended ✨" : "Paused for today");
      }
      await fetchSub();
    } catch (e) { toast.error("Could not update"); }
    finally { setBusy(false); }
  };

  if (loading) return <AppShell><Skeleton /></AppShell>;

  if (!sub) {
    return (
      <AppShell>
        <div className="mt-10 tf-card p-10 text-center">
          <Sparkles className="mx-auto text-orange-500" size={28} />
          <h2 className="font-display text-2xl font-bold mt-4">No active subscription</h2>
          <p className="text-neutral-500 mt-2">Start a plan to unlock your delivery calendar.</p>
          <Link to="/plans" data-testid="calendar-empty-cta" className="mt-6 inline-flex px-6 py-3 rounded-full bg-orange-600 text-white font-semibold">Browse plans</Link>
        </div>
      </AppShell>
    );
  }

  const tracking = sub.tracking || [];
  const days = Array.from(new Set(tracking.map((row) => row.date))).slice(0, 42);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Subscription</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">{sub.plan_name}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span className="text-neutral-500">{sub.remaining_meals ?? sub.meals_left}/{sub.total_meals} meals left</span>
          <span className="h-1 w-1 rounded-full bg-neutral-300" />
          <span className="text-neutral-500">Till {sub.expires_at}</span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${((sub.remaining_meals ?? sub.meals_left) / sub.total_meals) * 100}%` }} />
        </div>

        <div className="mt-7 tf-card p-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
            <CalendarDays size={12} /> Delivery calendar
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-neutral-400 mb-1">{d}</div>
            ))}
            {days.map((d) => {
              const rows = tracking.filter((row) => row.date === d);
              const paused = rows.some((row) => row.status === "paused");
              const delivered = rows.some((row) => row.status === "consumed");
              const kitchenClosed = rows.some((row) => row.status === "kitchen_closed");
              const isToday = d === today;
              return (
                <motion.button
                  key={d}
                  data-testid={`cal-day-${d}`}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => togglePause(d)}
                  disabled={busy}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all
                    ${kitchenClosed ? "bg-red-50 text-red-700 border border-red-200" :
                      paused ? "bg-neutral-100 text-neutral-400 line-through" :
                      delivered ? "bg-green-50 text-green-700 border border-green-200" :
                      isToday ? "bg-orange-50 text-orange-700 border-2 border-orange-500 font-bold" :
                      "bg-white border border-neutral-200 text-neutral-700 hover:border-orange-300"}`}
                >
                  <span className="text-xs font-semibold">{parseInt(d.slice(-2), 10)}</span>
                  {paused && <Pause size={9} className="absolute bottom-1 right-1" />}
                  {kitchenClosed && <span className="absolute bottom-1 text-[8px] font-bold">Closed</span>}
                  {delivered && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-green-600" />}
                </motion.button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-[11px]">
            <Legend className="bg-orange-50 border-orange-500 text-orange-700" label="Today" />
            <Legend className="bg-white border-neutral-300 text-neutral-700" label="Active" />
            <Legend className="bg-green-50 border-green-300 text-green-700" label="Delivered" />
            <Legend className="bg-neutral-100 border-neutral-300 text-neutral-400" label="Paused" />
            <Legend className="bg-red-50 border-red-300 text-red-700" label="Kitchen closed" />
          </div>
          <p className="mt-4 text-xs text-neutral-500">Tap a date to pause/resume. Pauses before 10:00 AM IST extend your plan by 1 day.</p>
        </div>
      </div>
    </AppShell>
  );
}

function Legend({ className, label }) {
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {label}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 mt-6">
      <div className="h-8 w-40 bg-neutral-200/70 rounded" />
      <div className="h-3 w-64 bg-neutral-200/60 rounded" />
      <div className="h-64 bg-neutral-100 rounded-3xl" />
    </div>
  );
}
