import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { CalendarDays, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { date: "", lunch_closed: false, dinner_closed: false, reason: "", recurring_rule: "" };

export default function AdminKitchenSchedule() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.date.localeCompare(b.date)), [items]);

  const load = async () => {
    const { data } = await api.get("/admin/kitchen-schedule");
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  const edit = (row) => {
    setForm({
      date: row.date,
      lunch_closed: !!row.lunch_closed,
      dinner_closed: !!row.dinner_closed,
      reason: row.reason || "",
      recurring_rule: row.recurring_rule || "",
    });
  };

  const save = async () => {
    if (!form.date) {
      toast.error("Date is required");
      return;
    }
    if (!form.lunch_closed && !form.dinner_closed) {
      toast.error("Close lunch, dinner, or both");
      return;
    }
    setBusy(true);
    try {
      await api.put("/admin/kitchen-schedule", form);
      toast.success("Kitchen schedule updated");
      setForm(EMPTY);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save schedule");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (date) => {
    if (!window.confirm("Remove this closure?")) return;
    await api.delete(`/admin/kitchen-schedule/${date}`);
    toast.success("Closure removed");
    await load();
  };

  return (
    <AppShell hideGutter>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">Admin</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-1">Kitchen Schedule</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-500">Close lunch, dinner, or the full day. Active subscription meals are skipped without deduction.</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <section className="tf-card p-5">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Plus size={16} className="text-orange-600" /> Closure details
            </div>
            <div className="mt-4 space-y-3">
              <Field label="Date">
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="tf-input" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Toggle label="Lunch closed" checked={form.lunch_closed} onChange={(value) => setForm({ ...form, lunch_closed: value })} />
                <Toggle label="Dinner closed" checked={form.dinner_closed} onChange={(value) => setForm({ ...form, dinner_closed: value })} />
              </div>
              <Field label="Reason">
                <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Festival prep, maintenance..." className="tf-input" />
              </Field>
              <Field label="Recurring rule">
                <input value={form.recurring_rule} onChange={(e) => setForm({ ...form, recurring_rule: e.target.value })} placeholder="Optional, e.g. every_sunday" className="tf-input" />
              </Field>
              <button disabled={busy} onClick={save} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60">
                <Save size={15} /> Save closure
              </button>
            </div>
          </section>

          <section className="tf-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4 text-sm font-bold">
              <CalendarDays size={16} className="text-orange-600" /> Upcoming closures
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-neutral-50 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Lunch</th>
                    <th className="px-4 py-3">Dinner</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Recurring</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((row) => (
                    <tr key={row.id} className="border-t border-neutral-100">
                      <td className="px-4 py-3 font-semibold">{row.date}</td>
                      <td className="px-4 py-3"><Status closed={row.lunch_closed} /></td>
                      <td className="px-4 py-3"><Status closed={row.dinner_closed} /></td>
                      <td className="px-4 py-3 text-neutral-600">{row.reason || "-"}</td>
                      <td className="px-4 py-3 text-neutral-600">{row.recurring_rule || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => edit(row)} className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50">Edit</button>
                          <button onClick={() => remove(row.date)} className="rounded-md border border-red-100 px-2.5 py-1.5 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedItems.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-500">No kitchen closures configured.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`h-10 rounded-md border px-3 text-left text-sm font-semibold transition ${checked ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 bg-white text-neutral-600"}`}
    >
      {label}
    </button>
  );
}

function Status({ closed }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${closed ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
      {closed ? "Closed" : "Open"}
    </span>
  );
}
