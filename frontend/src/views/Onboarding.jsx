import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { MapPin, Leaf, Sparkles, ArrowRight, Check } from "lucide-react";

const TAGS = [
  { id: "veg", label: "Veg", emoji: "🥗" },
  { id: "jain", label: "Jain", emoji: "🌿" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "high_protein", label: "High Protein", emoji: "💪" },
  { id: "low_carb", label: "Low Carb", emoji: "🍳" },
  { id: "diabetic", label: "Diabetic friendly", emoji: "❤️" },
];

export default function Onboarding() {
  const { updateProfile, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState("");
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);

  const toggleTag = (t) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAddress(`Near ${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`);
        toast.success("Location detected");
      },
      () => toast.error("Could not detect location")
    );
  };

  const finish = async () => {
    setBusy(true);
    try {
      await updateProfile({ address_summary: address || "Address pending", dietary_tags: tags });
      toast.success("You're all set!");
      navigate("/home", { replace: true });
    } catch {
      toast.error("Could not save");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen tf-grain bg-tfcream flex flex-col">
      <div className="px-6 md:px-12 py-6 flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-display font-bold text-sm">T</div>
        <span className="font-display font-bold tracking-tight">TiffinFlow</span>
        <div className="ml-auto flex gap-1.5">
          {[0, 1, 2].map((s) => (
            <span key={s} className={`h-1.5 rounded-full transition-all ${step >= s ? "w-8 bg-orange-500" : "w-4 bg-neutral-200"}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-6">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <Step key="hello">
                <h1 className="font-display text-4xl font-bold tracking-tight">Hi {user?.full_name?.split(" ")[0]} 👋</h1>
                <p className="text-neutral-600 mt-3 leading-relaxed">
                  Let's set you up in 30 seconds. We'll learn how you eat and where to deliver.
                </p>
                <div className="mt-8 tf-card p-5 flex items-center gap-3">
                  <Sparkles size={20} className="text-orange-600" />
                  <div>
                    <div className="text-sm font-semibold">₹100 welcome credit added</div>
                    <div className="text-xs text-neutral-500">Use it on your first order or plan.</div>
                  </div>
                </div>
                <Action data-testid="onb-step-0-next" onClick={() => setStep(1)}>Continue</Action>
              </Step>
            )}

            {step === 1 && (
              <Step key="address">
                <h1 className="font-display text-3xl font-bold tracking-tight">Where do we deliver?</h1>
                <p className="text-neutral-600 mt-3 leading-relaxed">A flat number, landmark or area works.</p>

                <div className="mt-6">
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      data-testid="onb-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Flat 302, Koramangala 4th block"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <button data-testid="onb-detect-location" onClick={detectLocation} className="mt-3 text-sm font-semibold text-orange-600">
                    Detect my location →
                  </button>
                </div>
                <Action data-testid="onb-step-1-next" onClick={() => setStep(2)} disabled={!address}>Continue</Action>
              </Step>
            )}

            {step === 2 && (
              <Step key="diet">
                <h1 className="font-display text-3xl font-bold tracking-tight">How do you eat?</h1>
                <p className="text-neutral-600 mt-3 leading-relaxed">Tap any that apply. You can change this later.</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {TAGS.map((t) => {
                    const on = tags.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        data-testid={`onb-tag-${t.id}`}
                        onClick={() => toggleTag(t.id)}
                        className={`relative px-4 py-4 rounded-2xl border text-left transition-all ${
                          on ? "border-orange-500 bg-orange-50" : "border-neutral-200 bg-white hover:border-neutral-300"
                        }`}
                      >
                        <div className="text-2xl">{t.emoji}</div>
                        <div className="mt-1 text-sm font-semibold">{t.label}</div>
                        {on && (
                          <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-orange-500 text-white flex items-center justify-center">
                            <Check size={12} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <Action data-testid="onb-finish" onClick={finish} disabled={busy}>{busy ? "Saving…" : "All set, take me in"}</Action>
              </Step>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Step({ children }) {
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  );
}

function Action({ children, disabled, onClick, ...rest }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className="mt-10 w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-full transition"
    >
      {children} <ArrowRight size={16} />
    </button>
  );
}
