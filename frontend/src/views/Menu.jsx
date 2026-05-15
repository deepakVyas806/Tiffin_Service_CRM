import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { Leaf, X, Flame } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "../components/ui/drawer";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Menu() {
  const [menu, setMenu] = useState([]);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/menu/week");
      setMenu(data);
    })();
  }, []);

  return (
    <AppShell>
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">This week</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Weekly menu</h1>
        <p className="text-neutral-500 mt-2 text-sm">Chef-curated, freshly cooked, delivered hot.</p>

        <div className="mt-6 space-y-3">
          {menu.map((m, i) => (
            <motion.button
              key={m.date}
              data-testid={`menu-card-${i}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => { setActive(m); setOpen(true); }}
              className="w-full text-left tf-card overflow-hidden flex active:scale-[0.99] transition-transform"
            >
              <div className="w-28 sm:w-36 h-28 sm:h-32 flex-shrink-0 relative bg-orange-100">
                {m.image_url ? (
                  <img src={m.image_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-orange-500"><Leaf size={28} /></div>
                )}
                {m.is_special && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    <Flame size={10} /> Special
                  </span>
                )}
                {m.kitchen_schedule?.full_day_closed && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 border border-red-100">
                    Closed
                  </span>
                )}
              </div>
              <div className="flex-1 p-4 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{DAY_NAMES[i]} · {m.date}</div>
                <div className="font-display font-bold text-base sm:text-lg mt-1 truncate">{m.main_dish}</div>
                <div className="text-xs text-neutral-500 mt-1 line-clamp-2">{(m.sides || []).join(" · ")}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.kitchen_schedule?.lunch_closed && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700">Lunch closed</span>}
                  {m.kitchen_schedule?.dinner_closed && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700">Dinner closed</span>}
                  {(m.tags || []).slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">{t.replaceAll('_', ' ')}</span>
                  ))}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-white">
          <DrawerTitle className="sr-only">Meal details</DrawerTitle>
          <DrawerDescription className="sr-only">Details about the selected meal.</DrawerDescription>
          {active && (
            <div className="p-6 pb-10 max-w-xl mx-auto">
              <div className="h-48 rounded-2xl overflow-hidden bg-orange-100 mb-5">
                {active.image_url && <img src={active.image_url} className="w-full h-full object-cover" alt="" />}
              </div>
              <h2 data-testid="meal-detail-title" className="font-display text-2xl font-bold tracking-tight">{active.main_dish}</h2>
              <p className="text-sm text-neutral-500 mt-1">{active.date}</p>
              {active.kitchen_schedule && (
                <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {active.kitchen_schedule.reason || "Kitchen availability is limited for this date."}
                </div>
              )}
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">Includes</div>
                <ul className="mt-2 space-y-1.5">
                  {(active.sides || []).map((s, i) => (
                    <li key={i} className="text-sm text-neutral-700 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />{s}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 grid grid-cols-4 gap-2">
                {Object.entries(active.nutrition || {}).map(([k, v]) => (
                  <div key={k} className="tf-card p-3 text-center">
                    <div className="text-lg font-display font-bold">{v}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{k}</div>
                  </div>
                ))}
              </div>
              <button data-testid="meal-detail-close" onClick={() => setOpen(false)} className="mt-6 w-full py-3.5 rounded-full bg-orange-600 text-white font-semibold">
                Got it
              </button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}
