import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { motion } from "framer-motion";
import { Plus, Edit3, Trash2, Sparkles, X, Save, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerTitle, DrawerDescription } from "../components/ui/drawer";
import ScrollableDrawerContent from "../components/ScrollableDrawerContent";

const EMPTY = { date: "", main_dish: "", sides: "", nutrition_calories: 650,
                nutrition_protein: 20, image_url: "", tags: "veg", is_special: false };

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    const { data } = await api.get("/admin/menu");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditing(false); setOpen(true); };
  const openEdit = (m) => {
    setForm({
      date: m.date, main_dish: m.main_dish,
      sides: (m.sides || []).join(", "),
      nutrition_calories: m.nutrition?.calories || 650,
      nutrition_protein: m.nutrition?.protein || 20,
      image_url: m.image_url || "",
      tags: (m.tags || []).join(", "),
      is_special: !!m.is_special,
    });
    setEditing(true); setOpen(true);
  };

  const save = async () => {
    if (!form.date || !form.main_dish) { toast.error("Date and main dish required"); return; }
    try {
      const body = {
        date: form.date,
        main_dish: form.main_dish,
        sides: form.sides.split(",").map(s => s.trim()).filter(Boolean),
        nutrition: { calories: Number(form.nutrition_calories) || 0, protein: Number(form.nutrition_protein) || 0 },
        image_url: form.image_url || null,
        tags: form.tags.split(",").map(s => s.trim()).filter(Boolean),
        is_special: form.is_special,
      };
      await api.put(`/admin/menu/${form.date}`, body);
      toast.success(editing ? "Menu updated" : "Menu added");
      setOpen(false);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };

  const del = async (date) => {
    if (!window.confirm("Delete this day?")) return;
    await api.delete(`/admin/menu/${date}`);
    toast.success("Deleted");
    load();
  };

  return (
    <AppShell hideGutter>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Admin</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Menu</h1>
          </div>
          <button data-testid="admin-menu-add" onClick={openNew} className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-4 py-2.5 rounded-full text-sm font-semibold">
            <Plus size={16} /> New day
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((m, i) => (
            <motion.div key={m.date} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="tf-card p-5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{m.date}</div>
                {m.is_special && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Special</span>}
              </div>
              <div className="font-display font-bold text-base mt-1">{m.main_dish}</div>
              <div className="text-xs text-neutral-500 mt-1 line-clamp-2">{(m.sides || []).join(" · ")}</div>
              <div className="mt-3 flex gap-1.5 flex-wrap">
                {(m.tags || []).map(t => <span key={t} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">{t}</span>)}
              </div>
              <div className="mt-4 flex gap-2">
                <button data-testid={`admin-menu-edit-${m.date}`} onClick={() => openEdit(m)} className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-orange-600">
                  <Edit3 size={13} /> Edit
                </button>
                <button data-testid={`admin-menu-del-${m.date}`} onClick={() => del(m.date)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </motion.div>
          ))}
          {items.length === 0 && <div className="col-span-full tf-card p-10 text-center text-sm text-neutral-500"><ChefHat className="mx-auto text-orange-500 mb-3" /> No menus yet — add your first day.</div>}
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <ScrollableDrawerContent>
          <DrawerTitle className="sr-only">Edit menu</DrawerTitle>
          <DrawerDescription className="sr-only">Add or edit a day's menu.</DrawerDescription>
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl font-bold">{editing ? "Edit day" : "Add day"}</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <FieldLabel label="Date (YYYY-MM-DD)"><input data-testid="menu-form-date" type="date" disabled={editing} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="tf-input" /></FieldLabel>
              <FieldLabel label="Main dish"><input data-testid="menu-form-dish" value={form.main_dish} onChange={e => setForm({ ...form, main_dish: e.target.value })} placeholder="Paneer Butter Masala" className="tf-input" /></FieldLabel>
              <FieldLabel label="Sides (comma separated)"><input data-testid="menu-form-sides" value={form.sides} onChange={e => setForm({ ...form, sides: e.target.value })} placeholder="Jeera Rice, Tawa Roti, Salad" className="tf-input" /></FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <FieldLabel label="Calories"><input data-testid="menu-form-cal" type="number" value={form.nutrition_calories} onChange={e => setForm({ ...form, nutrition_calories: e.target.value })} className="tf-input" /></FieldLabel>
                <FieldLabel label="Protein (g)"><input data-testid="menu-form-protein" type="number" value={form.nutrition_protein} onChange={e => setForm({ ...form, nutrition_protein: e.target.value })} className="tf-input" /></FieldLabel>
              </div>
              <FieldLabel label="Image URL"><input data-testid="menu-form-img" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="tf-input" /></FieldLabel>
              <FieldLabel label="Tags (comma separated)"><input data-testid="menu-form-tags" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="veg, special" className="tf-input" /></FieldLabel>
              <label className="flex items-center gap-2 mt-2">
                <input data-testid="menu-form-special" type="checkbox" checked={form.is_special} onChange={e => setForm({ ...form, is_special: e.target.checked })} className="accent-orange-600 h-4 w-4" />
                <span className="text-sm font-semibold flex items-center gap-1"><Sparkles size={14} className="text-orange-600" /> Mark as special</span>
              </label>
            </div>
            <button data-testid="menu-form-save" onClick={save} className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3.5 rounded-full">
              <Save size={16} /> Save
            </button>
          </div>
        </ScrollableDrawerContent>
      </Drawer>
    </AppShell>
  );
}

function FieldLabel({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
