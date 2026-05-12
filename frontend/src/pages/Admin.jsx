import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { Users, ShoppingBag, Sparkles, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, o] = await Promise.all([api.get("/admin/stats"), api.get("/admin/orders")]);
      setStats(s.data); setOrders(o.data);
    })();
  }, []);

  return (
    <AppShell hideGutter>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Admin</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Operations</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={IndianRupee} label="Revenue" value={`₹${(stats?.revenue || 0).toFixed(0)}`} accent="bg-orange-50 text-orange-600" />
          <KpiCard icon={Users} label="Customers" value={stats?.total_users ?? "—"} accent="bg-green-50 text-green-600" />
          <KpiCard icon={Sparkles} label="Active subs" value={stats?.active_subscriptions ?? "—"} accent="bg-amber-50 text-amber-600" />
          <KpiCard icon={ShoppingBag} label="Orders" value={stats?.total_orders ?? "—"} accent="bg-neutral-100 text-neutral-700" />
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500 mb-3">Recent orders</div>
          <div className="tf-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 20).map((o) => (
                  <tr key={o.id} className="border-t border-neutral-100">
                    <td className="px-4 py-3">{o.menu_date}</td>
                    <td className="px-4 py-3 font-semibold">₹{o.amount}</td>
                    <td className="px-4 py-3 uppercase text-xs">{o.payment_mode}</td>
                    <td className="px-4 py-3 capitalize">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.status === "delivered" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {o.status.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-neutral-500">No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({ icon: Icon, label, value, accent }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tf-card p-4">
      <div className={`h-9 w-9 rounded-xl ${accent} flex items-center justify-center`}><Icon size={16} /></div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mt-3">{label}</div>
      <div className="font-display text-2xl font-bold mt-1">{value}</div>
    </motion.div>
  );
}
