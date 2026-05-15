import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { motion } from "framer-motion";
import { Banknote, MapPin, Save, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../components/ui/switch";

export default function AdminSettings() {
  const [s, setS] = useState({ cod_enabled: true, delivery_zones: [] });
  const [newZone, setNewZone] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get("/admin/settings");
    setS(data);
  };
  useEffect(() => { load(); }, []);

  const save = async (patch) => {
    setBusy(true);
    try {
      const { data } = await api.put("/admin/settings", patch);
      setS(data);
      toast.success("Settings saved");
    } catch (e) { toast.error("Save failed"); }
    finally { setBusy(false); }
  };

  const toggleCod = (v) => save({ cod_enabled: v });
  const addZone = () => {
    if (!newZone) return;
    save({ delivery_zones: [...new Set([...s.delivery_zones, newZone])] });
    setNewZone("");
  };
  const removeZone = (z) => save({ delivery_zones: s.delivery_zones.filter(x => x !== z) });

  return (
    <AppShell hideGutter>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Admin</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Settings</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tf-card p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600"><Banknote size={20} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Cash on delivery</div>
            <div className="text-xs text-neutral-500">Allow customers to pay on delivery for orders and subscriptions.</div>
          </div>
          <Switch data-testid="settings-cod-toggle" checked={s.cod_enabled} onCheckedChange={toggleCod} disabled={busy} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tf-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-green-50 flex items-center justify-center text-green-600"><MapPin size={20} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Delivery zones</div>
              <div className="text-xs text-neutral-500">Add pincodes or area codes where Tiffin Center delivers.</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {s.delivery_zones.length === 0 && <span className="text-xs text-neutral-500">No zones yet</span>}
            {s.delivery_zones.map((z) => (
              <span key={z} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                {z}
                <button data-testid={`zone-remove-${z}`} onClick={() => removeZone(z)} className="hover:text-red-600"><X size={12} /></button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              data-testid="zone-input"
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              placeholder="e.g. 560034"
              className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button data-testid="zone-add" onClick={addZone} className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-4 rounded-xl text-sm font-semibold">
              <Plus size={14} /> Add
            </button>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
