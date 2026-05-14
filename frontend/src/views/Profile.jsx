import { useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { LogOut, MapPin, User, Phone, Mail, Sparkles, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TAGS = ["veg","jain","vegan","high_protein","low_carb","diabetic"];

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
    address_summary: user?.address_summary || "",
    dietary_tags: user?.dietary_tags || [],
  });
  const [busy, setBusy] = useState(false);

  const toggle = (t) => setForm({ ...form, dietary_tags: form.dietary_tags.includes(t) ? form.dietary_tags.filter(x => x !== t) : [...form.dietary_tags, t] });

  const save = async () => {
    setBusy(true);
    try { await updateProfile(form); toast.success("Profile updated"); }
    catch { toast.error("Could not save"); }
    finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-display text-2xl font-bold">
            {user?.full_name?.[0]?.toUpperCase() || "T"}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">{user?.full_name}</h1>
            <div className="text-sm text-neutral-500">{user?.email}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
              <Sparkles size={10} /> {user?.role}
            </div>
          </div>
        </div>

        <div className="tf-card p-5 space-y-3">
          <Row icon={User} label="Full name">
            <input data-testid="profile-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full bg-transparent focus:outline-none text-sm font-semibold" />
          </Row>
          <Row icon={Phone} label="Phone">
            <input data-testid="profile-phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-transparent focus:outline-none text-sm font-semibold" />
          </Row>
          <Row icon={Mail} label="Email"><span className="text-sm">{user?.email}</span></Row>
          <Row icon={MapPin} label="Delivery address">
            <input data-testid="profile-address" value={form.address_summary || ""} onChange={(e) => setForm({ ...form, address_summary: e.target.value })} className="w-full bg-transparent focus:outline-none text-sm font-semibold" />
          </Row>
        </div>

        <div className="tf-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Dietary preferences</div>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => {
              const on = form.dietary_tags.includes(t);
              return (
                <button key={t} data-testid={`profile-tag-${t}`} onClick={() => toggle(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${on ? "bg-orange-600 text-white border-orange-600" : "bg-white text-neutral-700 border-neutral-200"}`}>
                  {t.replaceAll('_',' ')}
                </button>
              );
            })}
          </div>
        </div>

        <button data-testid="profile-save" disabled={busy} onClick={save} className="w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-full">
          <Save size={16} /> {busy ? "Saving…" : "Save changes"}
        </button>

        <button data-testid="profile-logout" onClick={async () => { await logout(); navigate("/"); }} className="w-full inline-flex items-center justify-center gap-2 bg-white border border-neutral-200 text-neutral-700 font-semibold py-3.5 rounded-full">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </AppShell>
  );
}

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-9 w-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Icon size={16} /></div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</div>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}
