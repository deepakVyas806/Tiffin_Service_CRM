import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { (async () => { const { data } = await api.get("/plans"); setPlans(data); })(); }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Subscription plans</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Eat better, every day.</h1>
          <p className="text-neutral-500 mt-2 text-sm">Pause anytime. Pay with wallet, UPI, card or cash on delivery.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {plans.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative tf-card p-6 ${i === 2 ? "ring-2 ring-orange-500" : ""}`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles size={10} /> {p.badge}
                </span>
              )}
              <div className="text-xs font-bold uppercase tracking-wider text-orange-600">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold">₹{p.price}</span>
                <span className="text-xs text-neutral-500">/ {p.validity_days}d</span>
              </div>
              <div className="text-sm text-neutral-500 mt-2">{p.description}</div>
              <ul className="mt-5 space-y-2 text-sm">
                <Feat>{p.meal_count} chef-curated tiffins</Feat>
                <Feat>Pause anytime · auto-extends plan</Feat>
                <Feat>COD, UPI, card and wallet supported</Feat>
              </ul>
              <button
                data-testid={`plan-cta-${i}`}
                onClick={() => navigate("/checkout", { state: { kind: "subscription", plan_id: p.id, amount: p.price, name: p.name } })}
                className="mt-6 w-full py-3.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-semibold transition"
              >
                Choose {p.name}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Feat({ children }) {
  return (
    <li className="flex items-start gap-2 text-neutral-700">
      <span className="h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center mt-0.5 flex-shrink-0"><Check size={12} /></span>
      <span>{children}</span>
    </li>
  );
}
