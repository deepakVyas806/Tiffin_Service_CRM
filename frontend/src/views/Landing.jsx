import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Leaf, Clock, ShieldCheck } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1734330932655-e6f3e7aff297?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400";
const FRESH_IMG = "https://images.unsplash.com/photo-1774106425926-bdbab1356790?crop=entropy&cs=srgb&fm=jpg&q=85&w=900";

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen tf-grain bg-tfcream">
      {/* Nav */}
      <header className="px-6 md:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-display font-bold">T</div>
          <span className="font-display text-xl font-bold tracking-tight">TiffinFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" data-testid="nav-login" className="text-sm font-semibold text-neutral-700 hover:text-orange-600">Sign in</Link>
          <Link to="/register" data-testid="nav-register" className="text-sm font-semibold bg-neutral-900 text-white px-5 py-2.5 rounded-full">Get started</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-6 md:pt-12 pb-20 grid md:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
        <div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={12} /> Tiffin reinvented
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mt-5 leading-[1.05]">
            Home-style tiffins, <span className="text-orange-600">delivered with calm</span>.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5 text-neutral-600 text-base sm:text-lg leading-relaxed max-w-lg">
            Chef-curated meals on a flexible subscription. Pause anytime, pay with wallet, UPI, card or cash on delivery.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8 flex flex-wrap items-center gap-3">
            <button data-testid="hero-start" onClick={() => navigate("/register")} className="group inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold px-7 py-4 rounded-full shadow-lg shadow-orange-600/20 transition">
              Start your tiffin <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </button>
            <Link to="/login" className="inline-flex items-center gap-2 font-semibold px-7 py-4 rounded-full border border-neutral-200 bg-white">
              I have an account
            </Link>
          </motion.div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { icon: Leaf, label: "Veg-first" },
              { icon: Clock, label: "Pause anytime" },
              { icon: ShieldCheck, label: "COD or UPI" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="tf-card p-3 flex items-center gap-2">
                <Icon size={16} className="text-green-600" />
                <span className="text-xs font-semibold text-neutral-700">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative">
          <div className="aspect-[4/5] rounded-[2rem] overflow-hidden tf-card relative">
            <img src={HERO_IMG} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 right-4 tf-glass rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center"><Leaf size={18} className="text-green-700" /></div>
              <div className="flex-1">
                <div className="text-xs uppercase font-bold tracking-wider text-neutral-500">Today's tiffin</div>
                <div className="text-sm font-semibold">Paneer Butter Masala + Jeera Rice</div>
              </div>
              <div className="text-xs font-bold text-orange-600">720 kcal</div>
            </div>
          </div>
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="hidden md:flex absolute -left-8 top-10 tf-card px-4 py-3 items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-semibold">Out for delivery</span>
          </motion.div>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="hidden md:flex absolute -right-6 bottom-24 tf-card px-4 py-3 items-center gap-2">
            <img src={FRESH_IMG} className="h-8 w-8 rounded-full object-cover" alt="" />
            <div className="text-xs"><div className="font-bold">1 free meal</div><div className="text-neutral-500">Welcome offer</div></div>
          </motion.div>
        </motion.div>
      </section>

      {/* Plan teaser */}
      <section className="px-6 md:px-12 pb-24 max-w-7xl mx-auto">
        <div className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Three taps to your first tiffin.</div>
        <div className="text-neutral-500 mt-2 max-w-lg">Pick a plan, set your address, and choose how you pay. No phone calls. No paperwork.</div>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            { t: "Trial Day", p: "₹99", d: "One tiffin to try us out." },
            { t: "Weekly", p: "₹899", d: "Seven home-style tiffins." },
            { t: "Monthly", p: "₹3,499", d: "Most popular. 30 meals." },
          ].map((c, i) => (
            <motion.div key={c.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="tf-card p-6">
              <div className="text-xs uppercase tracking-widest font-bold text-orange-600">{c.t}</div>
              <div className="font-display text-3xl font-bold mt-2">{c.p}</div>
              <div className="text-sm text-neutral-500 mt-2">{c.d}</div>
            </motion.div>
          ))}
        </div>
        <div className="mt-10">
          <Link to="/register" data-testid="landing-cta" className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-7 py-4 rounded-full">
            Get started — it's free <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
