import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth, formatApiError } from "../lib/auth";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.full_name?.split(" ")[0] || "friend"}`);
      const next = location.state?.from || (u.role === "admin" ? "/admin" : u.role === "delivery" ? "/delivery" : "/home");
      navigate(next, { replace: true });
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
          <span className="font-display text-xl font-bold tracking-tight">TiffinFlow</span>
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-neutral-500 mt-2">Sign in to your tiffin dashboard.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Email</span>
            <div className="mt-1 relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input data-testid="login-email" required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition" placeholder="you@email.com" />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Password</span>
            <div className="mt-1 relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input data-testid="login-password" required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition" placeholder="••••••••" />
            </div>
          </label>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button data-testid="login-submit" disabled={busy} className="group w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition">
            {busy ? "Signing in…" : <>Sign in <ArrowRight size={16} className="transition group-hover:translate-x-1" /></>}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
          No account? <Link data-testid="login-register-link" to="/register" className="text-orange-600 font-semibold">Create one</Link>
        </div>
        <div className="mt-3 text-center text-[11px] text-neutral-400">Try admin@tiffinflow.com / admin123</div>
      </motion.div>
    </div>
  );
}
