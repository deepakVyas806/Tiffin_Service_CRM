import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { motion } from "framer-motion";
import { Truck, MapPin, Check } from "lucide-react";
import { toast } from "sonner";

export default function Delivery() {
  const [orders, setOrders] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [otpMap, setOtpMap] = useState({});

  const load = async () => {
    const { data } = await api.get("/delivery/assigned");
    setOrders(data);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (orderId, status, payment_mode) => {
    setBusyId(orderId);
    try {
      const payload = { order_id: orderId, status };
      if (status === "delivered" && payment_mode === "cod") {
        payload.otp = otpMap[orderId];
        if (!payload.otp) { toast.error("Enter OTP first"); setBusyId(null); return; }
      }
      await api.post("/delivery/update", payload);
      toast.success(`Marked ${status.replaceAll("_"," ")}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally { setBusyId(null); }
  };

  return (
    <AppShell hideGutter>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Delivery partner</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Today's runs</h1>
        </div>

        {orders.length === 0 && <div className="tf-card p-8 text-center text-sm text-neutral-500">No deliveries assigned.</div>}

        <div className="space-y-3">
          {orders.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="tf-card p-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600"><Truck size={20} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{o.menu_date} · ₹{o.amount}</div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1"><MapPin size={11} /> {o.address || "Address pending"}</div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${o.status === "delivered" ? "bg-green-100 text-green-700" : o.status === "out_for_delivery" ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700"}`}>
                  {o.status.replaceAll("_"," ")}
                </span>
              </div>

              {o.payment_mode === "cod" && o.status !== "delivered" && (
                <div className="mt-4 flex items-center gap-2">
                  <input
                    data-testid={`delivery-otp-${o.id}`}
                    placeholder="Enter COD OTP"
                    inputMode="numeric"
                    maxLength={4}
                    value={otpMap[o.id] || ""}
                    onChange={(e) => setOtpMap({ ...otpMap, [o.id]: e.target.value })}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-bold tracking-widest text-center"
                  />
                  <span className="text-[10px] text-neutral-500">Hint: {o.cod_otp}</span>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {o.status === "preparing" && (
                  <button data-testid={`delivery-ofd-${o.id}`} disabled={busyId === o.id} onClick={() => updateStatus(o.id, "out_for_delivery", o.payment_mode)} className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold">
                    Mark out for delivery
                  </button>
                )}
                {o.status !== "delivered" && (
                  <button data-testid={`delivery-deliver-${o.id}`} disabled={busyId === o.id} onClick={() => updateStatus(o.id, "delivered", o.payment_mode)} className="px-4 py-2 rounded-full bg-green-600 hover:bg-green-500 text-white text-sm font-semibold inline-flex items-center gap-1.5">
                    <Check size={14} /> Mark delivered
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
