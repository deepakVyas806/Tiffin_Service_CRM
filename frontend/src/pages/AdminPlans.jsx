import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { motion } from "framer-motion";
import { Plus, Edit3, Trash2, Save, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "../components/ui/drawer";

const EMPTY = { id: null, name: "", description: "", meal_count: 7, price: 899, validity_days: 7, badge: "" };

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    const { data } = await api.get("/admin/plans");
    setPlans(data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (p) => { setForm({ ...p, badge: p.badge || "" }); setOpen(true); };

  const save = async () => {
    if (!form.name || !form.description) { toast.error("Name and description required"); return; }
    const body = {
      name: form.name,
      description: form.description,
      meal_count: Number(form.meal_count) || 1,
      price: Number(form.price) || 0,
      validity_days: Number(form.validity_days) || 1,
      badge: form.badge || null,
    };
    try {
      if (form.id) {
        await api.put(`/admin/plans/${form.id}`, body);
        toast.success("Plan updated");
      } else {
        await api.post(`/admin/plans`, body);
        toast.success("Plan created");
      }
      setOpen(false);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this plan?")) return;
    await api.delete(`/admin/plans/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <AppShell hideGutter>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Admin</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Plans</h1>
          </div>
          <button data-testid="admin-plans-add" onClick={openNew} className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-4 py-2.5 rounded-full text-sm font-semibold">
            <Plus size={16} /> New plan
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {plans.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="tf-card p-5">
              {p.badge && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-wider"><Sparkles size={10} /> {p.badge}</span>}
              <div className="font-display text-xl font-bold mt-2">{p.name}</div>
              <div className="text-sm text-neutral-500 mt-1">{p.description}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-orange-600">₹{p.price}</span>
                <span className="text-xs text-neutral-500">/ {p.validity_days}d · {p.meal_count} meals</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button data-testid={`admin-plan-edit-${p.id}`} onClick={() => openEdit(p)} className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-orange-600"><Edit3 size={13} /> Edit</button>
                <button data-testid={`admin-plan-del-${p.id}`} onClick={() => del(p.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><Trash2 size={13} /> Delete</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-white">
          <DrawerTitle className="sr-only">Plan form</DrawerTitle>
          <DrawerDescription className="sr-only">Create or update a plan.</DrawerDescription>
          <div className="p-6 pb-10 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl font-bold">{form.id ? "Edit plan" : "New plan"}</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <Label l="Name"><input data-testid="plan-form-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="fi" placeholder="Weekly Plan" /></Label>
              <Label l="Description"><textarea data-testid="plan-form-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="fi" placeholder="7 home-style tiffins..." /></Label>
              <div className="grid grid-cols-3 gap-3">
                <Label l="Price (₹)"><input data-testid="plan-form-price" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="fi" /></Label>
                <Label l="Meals"><input data-testid="plan-form-meals" type="number" value={form.meal_count} onChange={e => setForm({ ...form, meal_count: e.target.value })} className="fi" /></Label>
                <Label l="Validity (d)"><input data-testid="plan-form-validity" type="number" value={form.validity_days} onChange={e => setForm({ ...form, validity_days: e.target.value })} className="fi" /></Label>
              </div>
              <Label l="Badge (optional)"><input data-testid="plan-form-badge" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} className="fi" placeholder="Most popular" /></Label>
            </div>
            <button data-testid="plan-form-save" onClick={save} className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3.5 rounded-full">
              <Save size={16} /> Save
            </button>
          </div>
        </DrawerContent>
      </Drawer>
      <style>{`.fi{width:100%;padding:.75rem 1rem;border-radius:1rem;border:1px solid #e5e7eb;background:#fff;font-size:.875rem;outline:none}.fi:focus{box-shadow:0 0 0 2px #EA580C}`}</style>
    </AppShell>
  );
}

function Label({ l, children }) {
  return <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{l}</span><div className="mt-1">{children}</div></label>;
}
