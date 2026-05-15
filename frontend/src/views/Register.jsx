import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth, formatApiError } from "../lib/auth";
import { toast } from "sonner";
import { Mail, Lock, User, Phone, ArrowRight } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await register(form);
      toast.success("Welcome to Tiffin Center! 1 free meal added");
      navigate("/onboarding", { replace: true });
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      setErr(msg); toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen tf-grain bg-tfcream flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md tf-card p-8">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-display font-bold">T</div>
          <span className="font-display text-xl font-bold tracking-tight">Tiffin Center</span>
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="text-neutral-500 mt-2">Get your first meal free, instantly.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field icon={User} testid="reg-name" label="Full name" type="text" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Aanya Sharma" />
          <Field icon={Mail} testid="reg-email" label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@email.com" />
          <Field icon={Phone} testid="reg-phone" label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+91 98765 43210" />
          <Field icon={Lock} testid="reg-password" label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="At least 6 characters" />

          {err && <div className="text-sm text-red-600">{err}</div>}
          <button data-testid="reg-submit" disabled={busy} className="group w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition">
            {busy ? "Creating…" : <>Create account <ArrowRight size={16} className="transition group-hover:translate-x-1" /></>}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
          Already with us? <Link data-testid="reg-login-link" to="/login" className="text-orange-600 font-semibold">Sign in</Link>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ icon: Icon, label, testid, ...rest }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</span>
      <div className="mt-1 relative">
        <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          data-testid={testid}
          required
          {...rest}
          onChange={(e) => rest.onChange(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
        />
      </div>
    </label>
  );
}
