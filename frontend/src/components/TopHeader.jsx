import { LogOut, MapPin, Sparkles } from "lucide-react";
import NotificationBell from "./NotificationBell";
import InstallAppButton from "./InstallAppButton";
import { useAuth } from "../lib/auth";
import { Link, useNavigate } from "react-router-dom";
import { isAdminRole } from "../config/permissions";

export default function TopHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initial = user?.full_name?.[0]?.toUpperCase() || "T";
  const admin = isAdminRole(user?.role);
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      data-testid="top-header"
      className="md:hidden sticky top-0 z-40 tf-glass border-b"
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-bold flex items-center gap-1">
            <MapPin size={11} /> {admin ? "Operations" : "Deliver to"}
          </div>
          <div className="text-sm font-semibold text-neutral-900 truncate">
            {admin ? "Admin workspace" : user?.address_summary || "Set delivery address"}
          </div>
        </div>
        <Link to={admin ? "/admin/kitchen-schedule" : "/plans"} data-testid="header-plans-cta" className="h-9 px-3 rounded-full bg-orange-50 text-orange-600 font-semibold text-xs flex items-center gap-1">
          <Sparkles size={14} /> {admin ? "Kitchen" : "Plans"}
        </Link>
        <InstallAppButton compact />
        <NotificationBell compact />
        {admin ? (
          <button
            type="button"
            data-testid="header-logout"
            onClick={handleLogout}
            className="h-9 w-9 rounded-full bg-white border border-black/5 text-neutral-600 flex items-center justify-center"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        ) : (
          <Link to="/profile" data-testid="header-avatar" className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
            {initial}
          </Link>
        )}
      </div>
    </header>
  );
}
