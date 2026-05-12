import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { motion } from "framer-motion";
import { Check, ChefHat, Truck, MapPin, Receipt, ArrowLeft } from "lucide-react";

const ICONS = { "Order placed": Receipt, "Preparing in kitchen": ChefHat, "Out for delivery": Truck, "Delivered": Check };

export default function Track() {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get(`/orders/${orderId}/track`);
        if (mounted) setData(data);
      } catch (e) {
        if (mounted) setErr(e.response?.data?.detail || "Could not load order");
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(t); };
  }, [orderId]);

  if (err) return <AppShell hideGutter><div className="tf-card p-8 text-center mt-10"><div className="text-sm text-neutral-500">{err}</div></div></AppShell>;
  if (!data) return <AppShell hideGutter><div className="animate-pulse h-72 bg-neutral-100 rounded-3xl mt-6" /></AppShell>;

  const { order, timeline } = data;
  const activeIdx = timeline.findIndex(s => s.state === "active");
  const lastDone = [...timeline].reverse().findIndex(s => s.state === "done");
  const currentIdx = activeIdx >= 0 ? activeIdx : (timeline.length - 1 - lastDone);

  return (
    <AppShell hideGutter>
      <div className="space-y-6">
        <Link to="/home" data-testid="track-back" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600">
          <ArrowLeft size={14} /> Back
        </Link>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Tracking</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <div className="mt-1 text-sm text-neutral-500">{order.menu_date} · ₹{order.amount}</div>
        </div>

        <motion.div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 border border-orange-100">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-200/40 blur-3xl" />
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-700">Current status</div>
            <div className="font-display text-2xl font-bold mt-2 capitalize">{order.status.replaceAll("_", " ")}</div>
            <div className="mt-2 text-sm text-neutral-600 flex items-center gap-1"><MapPin size={12} /> {order.address || "Address pending"}</div>
          </div>
        </motion.div>

        <div className="tf-card p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-5">Timeline</div>
          <ol className="space-y-5 relative">
            <span className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-neutral-100" aria-hidden />
            {timeline.map((s, i) => {
              const Icon = ICONS[s.label] || Check;
              const done = s.state === "done";
              const active = s.state === "active";
              return (
                <motion.li
                  key={i}
                  data-testid={`track-step-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="relative pl-12"
                >
                  <span className={`absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                    done ? "bg-green-500 border-green-500 text-white"
                    : active ? "bg-orange-500 border-orange-500 text-white tf-pulse"
                    : "bg-white border-neutral-200 text-neutral-300"
                  }`}>
                    <Icon size={14} />
                  </span>
                  <div className={`font-semibold ${done || active ? "text-neutral-900" : "text-neutral-400"}`}>{s.label}</div>
                  {s.at && <div className="text-xs text-neutral-500 mt-0.5">{new Date(s.at).toLocaleString()}</div>}
                </motion.li>
              );
            })}
          </ol>
        </div>

        {order.payment_mode === "cod" && order.status !== "delivered" && (
          <div className="tf-card p-5 bg-amber-50/40 border-amber-200">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Cash on delivery</div>
            <div className="mt-1 text-sm">Share this OTP with the delivery partner: <span className="font-bold font-display text-2xl tracking-widest">{order.cod_otp}</span></div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
