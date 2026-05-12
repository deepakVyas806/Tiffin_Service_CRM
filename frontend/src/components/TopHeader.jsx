import { Bell, MapPin, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Link } from "react-router-dom";

export default function TopHeader() {
  const { user } = useAuth();
  const initial = user?.full_name?.[0]?.toUpperCase() || "T";
  return (
    <header
      data-testid="top-header"
      className="md:hidden sticky top-0 z-40 tf-glass border-b"
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-bold flex items-center gap-1">
            <MapPin size={11} /> Deliver to
          </div>
          <div className="text-sm font-semibold text-neutral-900 truncate">
            {user?.address_summary || "Set delivery address"}
          </div>
        </div>
        <Link to="/plans" data-testid="header-plans-cta" className="h-9 px-3 rounded-full bg-orange-50 text-orange-600 font-semibold text-xs flex items-center gap-1">
          <Sparkles size={14} /> Plans
        </Link>
        <button data-testid="header-bell" className="h-9 w-9 rounded-full bg-white border border-black/5 flex items-center justify-center">
          <Bell size={16} className="text-neutral-700" />
        </button>
        <Link to="/profile" data-testid="header-avatar" className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
          {initial}
        </Link>
      </div>
    </header>
  );
}
